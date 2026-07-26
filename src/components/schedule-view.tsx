"use client";

import { useMemo, useRef, useState } from "react";
import {
  CalendarClock,
  Download,
  FileImage,
  ImagePlus,
  Pencil,
  Plus,
  Save,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type PrintDesign = {
  title: string;
  subtitle: string;
  accent: string;
  letterheadDataUrl: string;
  backgroundDataUrl: string;
};

export type ScheduleTemplate = {
  id: string;
  name: string;
  default_anchor_time: string;
  active: boolean;
  print_design: PrintDesign | null;
};

export type ScheduleBlock = {
  id: string;
  template_id: string;
  name: string;
  position: number;
  duration_minutes: number;
  gap_after_minutes: number;
  rule_type: "after_previous" | "fixed_start";
  fixed_start_time: string | null;
};

type CalculatedBlock = { name: string; start: string; end: string };

export type ScheduleInstance = {
  id: string;
  template_id: string;
  date: string;
  label: string;
  anchor_start_time: string;
  calculated_blocks: CalculatedBlock[];
};

export type ScheduleBundle = {
  templates: ScheduleTemplate[];
  blocks: ScheduleBlock[];
  instances: ScheduleInstance[];
};

const emptyDesign: PrintDesign = {
  title: "",
  subtitle: "",
  accent: "#173f68",
  letterheadDataUrl: "",
  backgroundDataUrl: "",
};

const minutes = (time: string) => {
  const [hours, mins] = time.split(":").map(Number);
  return hours * 60 + mins;
};

const clock = (total: number) => {
  const hours = Math.floor(total / 60) % 24;
  const mins = total % 60;
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(mins).padStart(2, "0")} ${hours >= 12 ? "PM" : "AM"}`;
};

const fileSafe = (value: string) =>
  value.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") ||
  "schedule";

function calculateBlocks(
  rows: ScheduleBlock[],
  anchor: string,
): CalculatedBlock[] {
  let cursor = minutes(anchor);
  return rows.map((block) => {
    if (block.rule_type === "fixed_start" && block.fixed_start_time) {
      cursor = minutes(block.fixed_start_time);
    }
    const start = cursor;
    const end = start + block.duration_minutes;
    cursor = end + block.gap_after_minutes;
    return { name: block.name, start: clock(start), end: clock(end) };
  });
}

async function downloadSchedulePdf({
  label,
  date,
  rows,
  design,
}: {
  label: string;
  date: string;
  rows: CalculatedBlock[];
  design: PrintDesign;
}) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "pt", format: "letter", orientation: "portrait" });
  const width = pdf.internal.pageSize.getWidth();
  const height = pdf.internal.pageSize.getHeight();

  if (design.backgroundDataUrl) {
    const backgroundProperties = pdf.getImageProperties(
      design.backgroundDataUrl,
    );
    pdf.addImage(
      design.backgroundDataUrl,
      backgroundProperties.fileType,
      0,
      0,
      width,
      height,
    );
  }

  const margin = 58;
  let top = 52;
  if (design.letterheadDataUrl) {
    const properties = pdf.getImageProperties(design.letterheadDataUrl);
    const imageWidth = Math.min(width - margin * 2, 360);
    const imageHeight = Math.min(
      86,
      (properties.height * imageWidth) / properties.width,
    );
    pdf.addImage(
      design.letterheadDataUrl,
      properties.fileType,
      (width - imageWidth) / 2,
      top,
      imageWidth,
      imageHeight,
    );
    top += imageHeight + 24;
  }

  const accent = design.accent || "#173f68";
  pdf.setTextColor(accent);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(22);
  pdf.text(design.title || label, width / 2, top, { align: "center" });
  top += 24;
  pdf.setTextColor("#53657a");
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  const subtitle =
    design.subtitle ||
    new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  pdf.text(subtitle, width / 2, top, { align: "center" });
  top += 30;

  const tableX = margin;
  const tableWidth = width - margin * 2;
  const rowHeight = Math.min(44, Math.max(31, (height - top - 54) / (rows.length + 1)));
  const timeWidth = 145;

  pdf.setFillColor(accent);
  pdf.roundedRect(tableX, top, tableWidth, rowHeight, 5, 5, "F");
  pdf.setTextColor("#ffffff");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text("CLASS / PERIOD", tableX + 18, top + rowHeight / 2 + 4);
  pdf.text("START TIME", tableX + tableWidth - 18, top + rowHeight / 2 + 4, {
    align: "right",
  });

  rows.forEach((row, index) => {
    const y = top + rowHeight * (index + 1);
    pdf.setFillColor(index % 2 ? "#f4f6f8" : "#ffffff");
    pdf.rect(tableX, y, tableWidth, rowHeight, "F");
    pdf.setDrawColor("#d7dde4");
    pdf.line(tableX, y + rowHeight, tableX + tableWidth, y + rowHeight);
    pdf.line(
      tableX + tableWidth - timeWidth,
      y,
      tableX + tableWidth - timeWidth,
      y + rowHeight,
    );
    pdf.setTextColor("#17283b");
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(12);
    pdf.text(row.name, tableX + 18, y + rowHeight / 2 + 4, {
      maxWidth: tableWidth - timeWidth - 36,
    });
    pdf.setFont("helvetica", "bold");
    pdf.text(row.start, tableX + tableWidth - 18, y + rowHeight / 2 + 4, {
      align: "right",
    });
  });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor("#7b8794");
  pdf.text(label, margin, height - 28);
  pdf.save(`${fileSafe(label)}.pdf`);
}

export default function ScheduleView({
  schoolId,
  userId,
  isPrincipal,
  initial,
}: {
  schoolId: string;
  userId: string;
  isPrincipal: boolean;
  initial: ScheduleBundle;
}) {
  const [templates, setTemplates] = useState(initial.templates);
  const [blocks, setBlocks] = useState(initial.blocks);
  const [instances, setInstances] = useState(initial.instances);
  const [selected, setSelected] = useState(initial.templates[0]?.id || "");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const template = templates.find((item) => item.id === selected);
  const rows = blocks
    .filter((block) => block.template_id === selected)
    .sort((a, b) => a.position - b.position);

  function reportError(message: string) {
    setNotice("");
    setError(message);
  }

  function reportSuccess(message: string) {
    setError("");
    setNotice(message);
  }

  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">Planning & publishing</p>
          <h1>Schedule studio</h1>
          <p>
            Build the timing rules once, then create polished schedules for the
            wall and staff.
          </p>
        </div>
      </div>
      {error && <p className="form-error setup-error">{error}</p>}
      {notice && <p className="schedule-notice">{notice}</p>}
      {!isPrincipal ? (
        <ScheduleLibrary instances={instances} templates={templates} />
      ) : (
        <div className="schedule-studio">
          <TemplatePanel
            schoolId={schoolId}
            rows={templates}
            setRows={setTemplates}
            selected={selected}
            setSelected={setSelected}
            onError={reportError}
          />
          {template ? (
            <Builder
              key={template.id}
              schoolId={schoolId}
              userId={userId}
              template={template}
              setTemplate={(updated) =>
                setTemplates((current) =>
                  current.map((item) =>
                    item.id === updated.id ? updated : item,
                  ),
                )
              }
              blocks={rows}
              allBlocks={blocks}
              setBlocks={setBlocks}
              instances={instances}
              setInstances={setInstances}
              onError={reportError}
              onSuccess={reportSuccess}
            />
          ) : (
            <div className="card empty-state schedule-empty">
              <CalendarClock />
              <h2>Create your first schedule type</h2>
              <p>
                Start with Regular Day, Friday, Fast Day, Farbrengen, or any
                schedule your yeshiva reuses.
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function TemplatePanel({
  schoolId,
  rows,
  setRows,
  selected,
  setSelected,
  onError,
}: {
  schoolId: string;
  rows: ScheduleTemplate[];
  setRows: (rows: ScheduleTemplate[]) => void;
  selected: string;
  setSelected: (id: string) => void;
  onError: (message: string) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [anchor, setAnchor] = useState("08:00");
  const [busy, setBusy] = useState(false);

  async function addTemplate() {
    setBusy(true);
    const { data, error } = await createClient()
      .from("schedule_templates")
      .insert({
        school_id: schoolId,
        name: name.trim(),
        default_anchor_time: anchor,
        print_design: emptyDesign,
      })
      .select("*")
      .single();
    setBusy(false);
    if (error) return onError(error.message);
    setRows([...rows, data]);
    setSelected(data.id);
    setName("");
    setCreating(false);
  }

  async function archiveTemplate() {
    if (!selected) return;
    const { error } = await createClient()
      .from("schedule_templates")
      .update({ active: false })
      .eq("id", selected);
    if (error) return onError(error.message);
    const remaining = rows.filter((row) => row.id !== selected);
    setRows(remaining);
    setSelected(remaining[0]?.id || "");
  }

  return (
    <aside className="card template-panel">
      <div className="card-head">
        <div>
          <span className="section-kicker">Reusable</span>
          <h2>Schedule types</h2>
        </div>
        <button
          className="icon-action"
          aria-label="Add schedule type"
          onClick={() => setCreating(true)}
        >
          <Plus />
        </button>
      </div>
      <div className="template-list">
        {rows.map((row) => (
          <button
            className={selected === row.id ? "active" : ""}
            key={row.id}
            onClick={() => setSelected(row.id)}
          >
            <CalendarClock />
            <span>
              <b>{row.name}</b>
              <small>
                {clock(minutes(row.default_anchor_time))} ·{" "}
                {row.print_design?.letterheadDataUrl
                  ? "Branded"
                  : "Standard design"}
              </small>
            </span>
          </button>
        ))}
      </div>
      {creating ? (
        <div className="template-new">
          <label>
            Schedule type
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Friday schedule"
            />
          </label>
          <label>
            Default starting time
            <input
              type="time"
              value={anchor}
              onChange={(event) => setAnchor(event.target.value)}
            />
          </label>
          <div className="setup-form-actions">
            <button
              className="secondary"
              onClick={() => setCreating(false)}
            >
              Cancel
            </button>
            <button
              className="primary"
              disabled={!name.trim() || busy}
              onClick={addTemplate}
            >
              <Plus />
              {busy ? "Creating…" : "Create type"}
            </button>
          </div>
        </div>
      ) : (
        <div className="template-panel-actions">
          <button className="secondary" onClick={() => setCreating(true)}>
            <Plus />
            New schedule type
          </button>
          {selected && (
            <button className="text-danger" onClick={archiveTemplate}>
              Archive selected
            </button>
          )}
        </div>
      )}
    </aside>
  );
}

function Builder({
  schoolId,
  userId,
  template,
  setTemplate,
  blocks,
  allBlocks,
  setBlocks,
  instances,
  setInstances,
  onError,
  onSuccess,
}: {
  schoolId: string;
  userId: string;
  template: ScheduleTemplate;
  setTemplate: (template: ScheduleTemplate) => void;
  blocks: ScheduleBlock[];
  allBlocks: ScheduleBlock[];
  setBlocks: (blocks: ScheduleBlock[]) => void;
  instances: ScheduleInstance[];
  setInstances: (instances: ScheduleInstance[]) => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}) {
  const [tab, setTab] = useState<"periods" | "design" | "publish">("periods");
  const [editingBlock, setEditingBlock] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("45");
  const [gap, setGap] = useState("10");
  const [ruleType, setRuleType] =
    useState<ScheduleBlock["rule_type"]>("after_previous");
  const [fixedStart, setFixedStart] = useState("08:00");
  const [anchor, setAnchor] = useState(
    template.default_anchor_time.slice(0, 5),
  );
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [label, setLabel] = useState(template.name);
  const [design, setDesign] = useState<PrintDesign>({
    ...emptyDesign,
    ...(template.print_design || {}),
  });
  const [busy, setBusy] = useState(false);
  const letterheadInput = useRef<HTMLInputElement>(null);
  const backgroundInput = useRef<HTMLInputElement>(null);
  const calculated = useMemo(
    () => calculateBlocks(blocks, anchor),
    [blocks, anchor],
  );

  async function saveTemplateBasics() {
    setBusy(true);
    const { data, error } = await createClient()
      .from("schedule_templates")
      .update({
        name: label.trim() || template.name,
        default_anchor_time: anchor,
      })
      .eq("id", template.id)
      .select("*")
      .single();
    setBusy(false);
    if (error) return onError(error.message);
    setTemplate(data);
    onSuccess("Schedule type updated.");
  }

  async function saveDesign() {
    setBusy(true);
    const { data, error } = await createClient()
      .from("schedule_templates")
      .update({ print_design: design })
      .eq("id", template.id)
      .select("*")
      .single();
    setBusy(false);
    if (error) return onError(error.message);
    setTemplate(data);
    onSuccess("Print design saved.");
  }

  async function addBlock() {
    const values = {
      name: name.trim(),
      duration_minutes: Number(duration),
      gap_after_minutes: Number(gap),
      rule_type: ruleType,
      fixed_start_time: ruleType === "fixed_start" ? fixedStart : null,
    };
    setBusy(true);
    const query = editingBlock
      ? createClient().from("schedule_blocks").update(values).eq("id", editingBlock)
      : createClient().from("schedule_blocks").insert({
          school_id: schoolId,
          template_id: template.id,
          ...values,
          position: blocks.length,
        });
    const { data, error } = await query.select("*").single();
    setBusy(false);
    if (error) return onError(error.message);
    setBlocks(
      editingBlock
        ? allBlocks.map((block) => (block.id === data.id ? data : block))
        : [...allBlocks, data],
    );
    resetBlockForm();
    onSuccess(editingBlock ? "Period updated." : "Period added.");
  }

  function resetBlockForm() {
    setEditingBlock(null);
    setName("");
    setDuration("45");
    setGap("10");
    setRuleType("after_previous");
  }

  function beginBlock(block: ScheduleBlock) {
    setEditingBlock(block.id);
    setName(block.name);
    setDuration(String(block.duration_minutes));
    setGap(String(block.gap_after_minutes));
    setRuleType(block.rule_type || "after_previous");
    setFixedStart(block.fixed_start_time?.slice(0, 5) || "08:00");
  }

  async function removeBlock(id: string) {
    const { error } = await createClient()
      .from("schedule_blocks")
      .delete()
      .eq("id", id);
    if (error) return onError(error.message);
    setBlocks(allBlocks.filter((block) => block.id !== id));
    if (editingBlock === id) resetBlockForm();
    onSuccess("Period removed.");
  }

  async function generate() {
    setBusy(true);
    const values = {
      school_id: schoolId,
      template_id: template.id,
      date,
      label: label.trim() || template.name,
      anchor_start_time: anchor,
      calculated_blocks: calculated,
      created_by: userId,
    };
    const { data, error } = await createClient()
      .from("schedule_instances")
      .upsert(values, { onConflict: "school_id,date" })
      .select("*")
      .single();
    setBusy(false);
    if (error) return onError(error.message);
    setInstances([...instances.filter((item) => item.date !== date), data]);
    onSuccess(`“${data.label}” saved and ready to share.`);
  }

  async function readImage(
    file: File | undefined,
    field: "letterheadDataUrl" | "backgroundDataUrl",
  ) {
    if (!file) return;
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      return onError("Please upload a PNG or JPG image.");
    }
    if (file.size > 1_500_000) {
      return onError("Please keep design images under 1.5 MB.");
    }
    const reader = new FileReader();
    reader.onload = () =>
      setDesign((current) => ({
        ...current,
        [field]: String(reader.result || ""),
      }));
    reader.readAsDataURL(file);
  }

  return (
    <div className="schedule-workspace">
      <section className="card schedule-workspace-head">
        <div>
          <span className="section-kicker">Editing schedule type</span>
          <input
            className="schedule-name-input"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            aria-label="Schedule label"
          />
        </div>
        <label>
          Default start
          <input
            type="time"
            value={anchor}
            onChange={(event) => setAnchor(event.target.value)}
          />
        </label>
        <button className="secondary" disabled={busy} onClick={saveTemplateBasics}>
          <Save />
          Save details
        </button>
      </section>

      <div className="schedule-tabs" role="tablist" aria-label="Schedule builder steps">
        {[
          ["periods", "1. Periods & rules"],
          ["design", "2. PDF design"],
          ["publish", "3. Save & share"],
        ].map(([value, text]) => (
          <button
            key={value}
            className={tab === value ? "active" : ""}
            onClick={() => setTab(value as typeof tab)}
            role="tab"
            aria-selected={tab === value}
          >
            {text}
          </button>
        ))}
      </div>

      {tab === "periods" && (
        <div className="schedule-edit-grid">
          <section className="card period-list-card">
            <div className="card-head">
              <div>
                <span className="section-kicker">Internal planning</span>
                <h2>Periods and timing rules</h2>
              </div>
            </div>
            {calculated.length ? (
              calculated.map((row, index) => (
                <div className="period-rule-row" key={blocks[index].id}>
                  <span className="period-number">{index + 1}</span>
                  <div>
                    <b>{row.name}</b>
                    <small>
                      {blocks[index].rule_type === "fixed_start"
                        ? `Fixed at ${row.start}`
                        : `${blocks[index].duration_minutes} min`}
                      {blocks[index].gap_after_minutes
                        ? ` · ${blocks[index].gap_after_minutes} min buffer after`
                        : ""}
                    </small>
                  </div>
                  <time>
                    {row.start} – {row.end}
                  </time>
                  <div className="row-actions">
                    <button
                      className="icon-btn"
                      aria-label={`Edit ${row.name}`}
                      onClick={() => beginBlock(blocks[index])}
                    >
                      <Pencil />
                    </button>
                    <button
                      className="icon-btn danger"
                      aria-label={`Remove ${row.name}`}
                      onClick={() => removeBlock(blocks[index].id)}
                    >
                      <Trash2 />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <ClockIllustration />
                <h3>Add the first period</h3>
                <p>The studio will calculate every start and end time for you.</p>
              </div>
            )}
          </section>
          <section className="card period-editor">
            <div>
              <span className="section-kicker">
                {editingBlock ? "Selected period" : "Next period"}
              </span>
              <h2>{editingBlock ? "Edit period" : "Add a period"}</h2>
            </div>
            <label>
              Period / class name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Chassidus Boker"
              />
            </label>
            <div className="field-pair">
              <label>
                Duration
                <span className="input-suffix">
                  <input
                    type="number"
                    min="1"
                    value={duration}
                    onChange={(event) => setDuration(event.target.value)}
                  />
                  <small>minutes</small>
                </span>
              </label>
              <label>
                Buffer after
                <span className="input-suffix">
                  <input
                    type="number"
                    min="0"
                    value={gap}
                    onChange={(event) => setGap(event.target.value)}
                  />
                  <small>minutes</small>
                </span>
              </label>
            </div>
            <label>
              Start-time rule
              <select
                value={ruleType}
                onChange={(event) =>
                  setRuleType(event.target.value as ScheduleBlock["rule_type"])
                }
              >
                <option value="after_previous">
                  Automatically after the previous period
                </option>
                <option value="fixed_start">Always begin at a fixed time</option>
              </select>
            </label>
            {ruleType === "fixed_start" && (
              <label>
                Fixed start time
                <input
                  type="time"
                  value={fixedStart}
                  onChange={(event) => setFixedStart(event.target.value)}
                />
              </label>
            )}
            <p className="rule-note">
              <Sparkles />
              Buffers and rules calculate the schedule but never appear on the
              public PDF.
            </p>
            <div className="setup-form-actions">
              {editingBlock && (
                <button className="secondary" onClick={resetBlockForm}>
                  <X />
                  Cancel
                </button>
              )}
              <button
                className="primary"
                disabled={!name.trim() || Number(duration) < 1 || busy}
                onClick={addBlock}
              >
                {editingBlock ? <Save /> : <Plus />}
                {editingBlock ? "Save period" : "Add period"}
              </button>
            </div>
          </section>
        </div>
      )}

      {tab === "design" && (
        <div className="schedule-design-grid">
          <section className="card print-settings">
            <div>
              <span className="section-kicker">Reusable branding</span>
              <h2>PDF design</h2>
              <p>Save a different design for each schedule type.</p>
            </div>
            <label>
              Printed title
              <input
                value={design.title}
                onChange={(event) =>
                  setDesign({ ...design, title: event.target.value })
                }
                placeholder={label}
              />
            </label>
            <label>
              Subtitle
              <input
                value={design.subtitle}
                onChange={(event) =>
                  setDesign({ ...design, subtitle: event.target.value })
                }
                placeholder="Leave blank to use the schedule date"
              />
            </label>
            <label>
              Accent color
              <span className="color-field">
                <input
                  type="color"
                  value={design.accent}
                  onChange={(event) =>
                    setDesign({ ...design, accent: event.target.value })
                  }
                />
                <input
                  value={design.accent}
                  onChange={(event) =>
                    setDesign({ ...design, accent: event.target.value })
                  }
                />
              </span>
            </label>
            <DesignUpload
              title="Yeshiva letterhead"
              description="Logo or complete letterhead image"
              hasFile={Boolean(design.letterheadDataUrl)}
              inputRef={letterheadInput}
              onFile={(file) => readImage(file, "letterheadDataUrl")}
              onRemove={() =>
                setDesign({ ...design, letterheadDataUrl: "" })
              }
            />
            <DesignUpload
              title="Custom page template"
              description="Optional full-page PNG or JPG skeleton"
              hasFile={Boolean(design.backgroundDataUrl)}
              inputRef={backgroundInput}
              onFile={(file) => readImage(file, "backgroundDataUrl")}
              onRemove={() =>
                setDesign({ ...design, backgroundDataUrl: "" })
              }
            />
            <button className="primary" disabled={busy} onClick={saveDesign}>
              <Save />
              {busy ? "Saving…" : "Save PDF design"}
            </button>
          </section>
          <PrintPreview
            label={label}
            date={date}
            rows={calculated}
            design={design}
          />
        </div>
      )}

      {tab === "publish" && (
        <div className="schedule-publish-grid">
          <section className="card publish-card">
            <div className="publish-icon">
              <FileImage />
            </div>
            <div>
              <span className="section-kicker">Ready to post</span>
              <h2>Create a dated schedule</h2>
              <p>
                Save this version to your schedule library, then download the
                clean PDF for printing, email, or staff chat.
              </p>
            </div>
            <label>
              Schedule label
              <input
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                placeholder="Fast day schedule"
              />
            </label>
            <label>
              Date
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </label>
            <div className="publish-actions">
              <button
                className="secondary"
                disabled={!calculated.length}
                onClick={() =>
                  downloadSchedulePdf({
                    label: label || template.name,
                    date,
                    rows: calculated,
                    design,
                  })
                }
              >
                <Download />
                Preview PDF
              </button>
              <button
                className="primary"
                disabled={!calculated.length || busy}
                onClick={generate}
              >
                <Save />
                {busy ? "Saving…" : "Save to library"}
              </button>
            </div>
          </section>
          <ScheduleLibrary
            instances={instances}
            templates={[template]}
            designOverride={design}
            onDelete={async (id) => {
              const { error } = await createClient()
                .from("schedule_instances")
                .delete()
                .eq("id", id);
              if (error) return onError(error.message);
              setInstances(instances.filter((item) => item.id !== id));
              onSuccess("Saved schedule removed.");
            }}
          />
        </div>
      )}
    </div>
  );
}

function DesignUpload({
  title,
  description,
  hasFile,
  inputRef,
  onFile,
  onRemove,
}: {
  title: string;
  description: string;
  hasFile: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onFile: (file: File | undefined) => void;
  onRemove: () => void;
}) {
  return (
    <div className={`design-upload ${hasFile ? "has-file" : ""}`}>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        className="sr-only"
        onChange={(event) => onFile(event.target.files?.[0])}
      />
      <ImagePlus />
      <div>
        <b>{title}</b>
        <small>{hasFile ? "Image ready" : description}</small>
      </div>
      {hasFile ? (
        <>
          <button className="tiny-primary" onClick={() => inputRef.current?.click()}>
            Replace
          </button>
          <button className="icon-btn danger" aria-label={`Remove ${title}`} onClick={onRemove}>
            <X />
          </button>
        </>
      ) : (
        <button className="tiny-primary" onClick={() => inputRef.current?.click()}>
          Upload
        </button>
      )}
    </div>
  );
}

function PrintPreview({
  label,
  date,
  rows,
  design,
}: {
  label: string;
  date: string;
  rows: CalculatedBlock[];
  design: PrintDesign;
}) {
  return (
    <section
      className="paper-preview"
      style={{
        backgroundImage: design.backgroundDataUrl
          ? `url(${design.backgroundDataUrl})`
          : undefined,
        "--schedule-accent": design.accent,
      } as React.CSSProperties}
    >
      {design.letterheadDataUrl && (
        // User-selected data URLs cannot be passed through next/image.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={design.letterheadDataUrl} alt="Yeshiva letterhead preview" />
      )}
      <h2>{design.title || label}</h2>
      <p>
        {design.subtitle ||
          new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
      </p>
      <div className="paper-table">
        <div className="paper-table-head">
          <b>Class / Period</b>
          <b>Start time</b>
        </div>
        {rows.map((row, index) => (
          <div key={`${row.name}-${index}`}>
            <span>{row.name}</span>
            <time>{row.start}</time>
          </div>
        ))}
      </div>
      {!rows.length && (
        <small className="paper-placeholder">Your schedule will appear here.</small>
      )}
    </section>
  );
}

function ScheduleLibrary({
  instances,
  templates,
  designOverride,
  onDelete,
}: {
  instances: ScheduleInstance[];
  templates: ScheduleTemplate[];
  designOverride?: PrintDesign;
  onDelete?: (id: string) => void;
}) {
  const visible = templates.length === 1
    ? instances.filter((item) => item.template_id === templates[0].id)
    : instances;
  return (
    <section className="card schedule-library">
      <div className="card-head">
        <div>
          <span className="section-kicker">Saved</span>
          <h2>Schedule library</h2>
        </div>
      </div>
      {visible.length ? (
        visible.map((instance) => {
          const template = templates.find(
            (item) => item.id === instance.template_id,
          );
          const design = designOverride || {
            ...emptyDesign,
            ...(template?.print_design || {}),
          };
          return (
            <div className="schedule-library-row" key={instance.id}>
              <span>
                <CalendarClock />
              </span>
              <div>
                <b>{instance.label || template?.name || "Schedule"}</b>
                <small>
                  {new Date(`${instance.date}T00:00:00`).toLocaleDateString()} ·{" "}
                  {instance.calculated_blocks.length} periods
                </small>
              </div>
              <button
                className="tiny-primary"
                onClick={() =>
                  downloadSchedulePdf({
                    label: instance.label || template?.name || "Schedule",
                    date: instance.date,
                    rows: instance.calculated_blocks,
                    design,
                  })
                }
              >
                <Download />
                PDF
              </button>
              {onDelete && (
                <button
                  className="icon-btn danger"
                  aria-label={`Remove ${instance.label}`}
                  onClick={() => onDelete(instance.id)}
                >
                  <Trash2 />
                </button>
              )}
            </div>
          );
        })
      ) : (
        <div className="empty-state">
          <CalendarClock />
          <h3>No saved schedules yet</h3>
          <p>Generate a dated schedule and it will remain here for reuse.</p>
        </div>
      )}
    </section>
  );
}

function ClockIllustration() {
  return <CalendarClock />;
}
