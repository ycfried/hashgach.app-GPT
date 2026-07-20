"use client";

import { useMemo, useState } from "react";
import {
  CalendarClock,
  Clock3,
  Pencil,
  Plus,
  Printer,
  Trash2,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type ScheduleTemplate = {
  id: string;
  name: string;
  default_anchor_time: string;
  active: boolean;
};
export type ScheduleBlock = {
  id: string;
  template_id: string;
  name: string;
  position: number;
  duration_minutes: number;
  gap_after_minutes: number;
};
export type ScheduleInstance = {
  id: string;
  template_id: string;
  date: string;
  anchor_start_time: string;
  calculated_blocks: { name: string; start: string; end: string }[];
};
export type ScheduleBundle = {
  templates: ScheduleTemplate[];
  blocks: ScheduleBlock[];
  instances: ScheduleInstance[];
};
const minutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};
const clock = (total: number) => {
  const h = Math.floor(total / 60) % 24,
    m = total % 60,
    n = h % 12 || 12;
  return `${n}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

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
  const template = templates.find((t) => t.id === selected);
  const rows = blocks
    .filter((b) => b.template_id === selected)
    .sort((a, b) => a.position - b.position);
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">Daily structure</p>
          <h1>Schedule builder</h1>
          <p>
            Create reusable day templates and generate a dated schedule from one
            anchor time.
          </p>
        </div>
      </div>
      {error && <p className="form-error setup-error">{error}</p>}
      {!isPrincipal ? (
        <InstanceList instances={instances} templates={templates} />
      ) : (
        <div className="schedule-builder">
          <TemplatePanel
            schoolId={schoolId}
            rows={templates}
            setRows={setTemplates}
            selected={selected}
            setSelected={setSelected}
            onError={setError}
          />
          {template ? (
            <Builder
              key={template.id}
              schoolId={schoolId}
              userId={userId}
              template={template}
              blocks={rows}
              allBlocks={blocks}
              setBlocks={setBlocks}
              instances={instances}
              setInstances={setInstances}
              onError={setError}
            />
          ) : (
            <div className="card empty-state">
              <CalendarClock />
              <p>Create your first day template to begin.</p>
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
  setRows: (v: ScheduleTemplate[]) => void;
  selected: string;
  setSelected: (v: string) => void;
  onError: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [anchor, setAnchor] = useState("08:00");
  async function add() {
    const client = createClient();
    const query = editing
      ? client
          .from("schedule_templates")
          .update({ name: name.trim(), default_anchor_time: anchor })
          .eq("id", selected)
      : client
          .from("schedule_templates")
          .insert({
            school_id: schoolId,
            name: name.trim(),
            default_anchor_time: anchor,
          });
    const { data, error } = await query.select("*").single();
    if (error) {
      onError(error.message);
      return;
    }
    setRows(
      editing
        ? rows.map((r) => (r.id === data.id ? data : r))
        : [...rows, data],
    );
    setSelected(data.id);
    setName("");
    setEditing(false);
  }
  function begin() {
    const row = rows.find((r) => r.id === selected);
    if (!row) return;
    setEditing(true);
    setName(row.name);
    setAnchor(row.default_anchor_time.slice(0, 5));
  }
  async function archive() {
    if (!selected) return;
    const { error } = await createClient()
      .from("schedule_templates")
      .update({ active: false })
      .eq("id", selected);
    if (error) {
      onError(error.message);
      return;
    }
    const next = rows.filter((r) => r.id !== selected);
    setRows(next);
    setSelected(next[0]?.id || "");
    setEditing(false);
    setName("");
  }
  return (
    <aside className="card template-panel">
      <div className="card-head">
        <h2>Day templates</h2>
      </div>
      <div className="template-list">
        {rows.map((r) => (
          <button
            className={selected === r.id ? "active" : ""}
            key={r.id}
            onClick={() => setSelected(r.id)}
          >
            <CalendarClock />
            <span>
              <b>{r.name}</b>
              <small>Starts {clock(minutes(r.default_anchor_time))}</small>
            </span>
          </button>
        ))}
      </div>
      <div className="template-new">
        <label>
          Template name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Regular day"
          />
        </label>
        <label>
          Anchor time
          <input
            type="time"
            value={anchor}
            onChange={(e) => setAnchor(e.target.value)}
          />
        </label>
        <div className="setup-form-actions">
          {editing && (
            <button
              className="secondary"
              onClick={() => {
                setEditing(false);
                setName("");
              }}
            >
              <X />
              Cancel
            </button>
          )}
          <button className="primary" disabled={!name.trim()} onClick={add}>
            {editing ? <Pencil /> : <Plus />}
            {editing ? "Save template" : "Add template"}
          </button>
        </div>
        {!editing && selected && (
          <div className="setup-form-actions">
            <button className="secondary" onClick={begin}>
              <Pencil />
              Edit selected
            </button>
            <button className="secondary danger" onClick={archive}>
              <Trash2 />
              Archive selected
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

function Builder({
  schoolId,
  userId,
  template,
  blocks,
  allBlocks,
  setBlocks,
  instances,
  setInstances,
  onError,
}: {
  schoolId: string;
  userId: string;
  template: ScheduleTemplate;
  blocks: ScheduleBlock[];
  allBlocks: ScheduleBlock[];
  setBlocks: (v: ScheduleBlock[]) => void;
  instances: ScheduleInstance[];
  setInstances: (v: ScheduleInstance[]) => void;
  onError: (v: string) => void;
}) {
  const [editingBlock, setEditingBlock] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("45");
  const [gap, setGap] = useState("10");
  const [anchor, setAnchor] = useState(
    template.default_anchor_time.slice(0, 5),
  );
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const calculated = useMemo(
    () =>
      blocks.reduce<{
        cursor: number;
        rows: { name: string; start: string; end: string }[];
      }>(
        (acc, b) => {
          const end = acc.cursor + b.duration_minutes;
          return {
            cursor: end + b.gap_after_minutes,
            rows: [
              ...acc.rows,
              { name: b.name, start: clock(acc.cursor), end: clock(end) },
            ],
          };
        },
        { cursor: minutes(anchor), rows: [] },
      ).rows,
    [blocks, anchor],
  );
  async function addBlock() {
    const client = createClient();
    const values = {
      name: name.trim(),
      duration_minutes: Number(duration),
      gap_after_minutes: Number(gap),
    };
    const query = editingBlock
      ? client.from("schedule_blocks").update(values).eq("id", editingBlock)
      : client.from("schedule_blocks").insert({
          school_id: schoolId,
          template_id: template.id,
          ...values,
          position: blocks.length,
        });
    const { data, error } = await query.select("*").single();
    if (error) {
      onError(error.message);
      return;
    }
    setBlocks(
      editingBlock
        ? allBlocks.map((b) => (b.id === data.id ? data : b))
        : [...allBlocks, data],
    );
    setName("");
    setEditingBlock(null);
  }
  function beginBlock(block: ScheduleBlock) {
    setEditingBlock(block.id);
    setName(block.name);
    setDuration(String(block.duration_minutes));
    setGap(String(block.gap_after_minutes));
  }
  async function removeBlock(id: string) {
    const { error } = await createClient()
      .from("schedule_blocks")
      .delete()
      .eq("id", id);
    if (error) {
      onError(error.message);
      return;
    }
    setBlocks(allBlocks.filter((b) => b.id !== id));
    if (editingBlock === id) {
      setEditingBlock(null);
      setName("");
    }
  }
  async function removeInstance(id: string) {
    const { error } = await createClient()
      .from("schedule_instances")
      .delete()
      .eq("id", id);
    if (error) {
      onError(error.message);
      return;
    }
    setInstances(instances.filter((i) => i.id !== id));
  }
  async function generate() {
    const { data, error } = await createClient()
      .from("schedule_instances")
      .upsert(
        {
          school_id: schoolId,
          template_id: template.id,
          date,
          anchor_start_time: anchor,
          calculated_blocks: calculated,
          created_by: userId,
        },
        { onConflict: "school_id,date" },
      )
      .select("*")
      .single();
    if (error) {
      onError(error.message);
      return;
    }
    setInstances([...instances.filter((i) => i.date !== date), data]);
  }
  return (
    <div className="schedule-main">
      <section className="card schedule-controls">
        <div>
          <h2>{template.name}</h2>
          <p>
            Change the anchor and every downstream time recalculates instantly.
          </p>
        </div>
        <label>
          Schedule date
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label>
          Anchor time
          <input
            type="time"
            value={anchor}
            onChange={(e) => setAnchor(e.target.value)}
          />
        </label>
        <button
          className="primary"
          disabled={!calculated.length}
          onClick={generate}
        >
          <CalendarClock />
          Generate day
        </button>
        <button className="secondary" onClick={() => window.print()}>
          <Printer />
          Print
        </button>
      </section>
      <section className="card schedule-preview">
        <div className="card-head">
          <h2>Calculated schedule</h2>
        </div>
        {calculated.length ? (
          calculated.map((r, i) => (
            <div className="calculated-row" key={`${r.name}-${i}`}>
              <span>{i + 1}</span>
              <div>
                <b>{r.name}</b>
                <small>
                  {blocks[i].duration_minutes} min
                  {blocks[i].gap_after_minutes
                    ? ` · ${blocks[i].gap_after_minutes} min gap after`
                    : ""}
                </small>
              </div>
              <time>
                {r.start}–{r.end}
              </time>
              <div className="row-actions">
                <button
                  className="icon-btn"
                  onClick={() => beginBlock(blocks[i])}
                >
                  <Pencil />
                </button>
                <button
                  className="icon-btn danger"
                  onClick={() => removeBlock(blocks[i].id)}
                >
                  <Trash2 />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <Clock3 />
            <p>Add blocks below to calculate this day.</p>
          </div>
        )}
      </section>
      <section className="card block-form">
        <h2>{editingBlock ? "Edit block" : "Add the next block"}</h2>
        <label>
          Block name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Chassidus Boker"
          />
        </label>
        <label>
          Duration
          <input
            type="number"
            min="1"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          />
          <small>minutes</small>
        </label>
        <label>
          Gap after
          <input
            type="number"
            min="0"
            value={gap}
            onChange={(e) => setGap(e.target.value)}
          />
          <small>minutes</small>
        </label>
        {editingBlock && (
          <button
            className="secondary"
            onClick={() => {
              setEditingBlock(null);
              setName("");
            }}
          >
            <X />
            Cancel
          </button>
        )}
        <button
          className="primary"
          disabled={!name.trim() || Number(duration) < 1}
          onClick={addBlock}
        >
          {editingBlock ? <Pencil /> : <Plus />}
          {editingBlock ? "Save block" : "Add block"}
        </button>
      </section>
      <section className="card setup-list">
        <div className="card-head">
          <h2>Generated schedules</h2>
        </div>
        {instances.length ? (
          instances.map((i) => (
            <div className="setup-row" key={i.id}>
              <span>
                <CalendarClock />
              </span>
              <div>
                <b>{new Date(i.date + "T00:00").toLocaleDateString()}</b>
                <small>{i.calculated_blocks.length} blocks</small>
              </div>
              <button
                className="icon-action danger"
                onClick={() => removeInstance(i.id)}
              >
                <Trash2 />
              </button>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <CalendarClock />
            <p>No schedules generated.</p>
          </div>
        )}
      </section>
    </div>
  );
}
function InstanceList({
  instances,
  templates,
}: {
  instances: ScheduleInstance[];
  templates: ScheduleTemplate[];
}) {
  return (
    <section className="card setup-list">
      <div className="card-head">
        <h2>Generated schedules</h2>
      </div>
      {instances.length ? (
        instances.map((i) => (
          <div className="setup-row" key={i.id}>
            <span>
              <CalendarClock />
            </span>
            <div>
              <b>{new Date(i.date + "T00:00").toLocaleDateString()}</b>
              <small>
                {templates.find((t) => t.id === i.template_id)?.name} ·{" "}
                {i.calculated_blocks.length} blocks
              </small>
            </div>
          </div>
        ))
      ) : (
        <div className="empty-state">
          <CalendarClock />
          <p>No schedules have been generated yet.</p>
        </div>
      )}
    </section>
  );
}
