"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Gift,
  Pencil,
  Plus,
  Scale,
  TimerReset,
  Trash2,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type DisciplineType = {
  id: string;
  name: string;
  description: string | null;
  category: "punishment" | "reward";
  points_value: number;
  is_fine: boolean;
  base_amount: number | null;
  late_threshold_min: number | null;
  late_threshold_max: number | null;
  active: boolean;
};
export type DisciplineStudent = { id: string; name: string };
export type DisciplineRecord = {
  id: string;
  assigned_by: string;
  student_id: string;
  punishment_type_id: string;
  assigned_at: string;
  created_via: "manual" | "auto_lateness";
  status: "pending" | "exacted" | "waived";
  due_at: string | null;
  snoozed_until: string | null;
  snooze_count: number;
  base_amount: number | null;
  current_amount: number | null;
  escalation_active: boolean;
  last_escalated_at?: string | null;
  exacted_by?: string | null;
  exacted_at?: string | null;
  exaction_notes: string | null;
};
export type DisciplineBundle = {
  types: DisciplineType[];
  records: DisciplineRecord[];
  students: DisciplineStudent[];
  snoozeDays: number;
  snoozeCap: number;
};

export default function DisciplineView({
  schoolId,
  userId,
  isPrincipal,
  initial,
}: {
  schoolId: string;
  userId: string;
  isPrincipal: boolean;
  initial: DisciplineBundle;
}) {
  const [tab, setTab] = useState<"queue" | "catalog">("queue");
  const [types, setTypes] = useState(initial.types);
  const [records, setRecords] = useState(initial.records);
  const [error, setError] = useState("");
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">Discipline & rewards</p>
          <h1>{isPrincipal ? "Pending actions" : "My assigned actions"}</h1>
          <p>Track every consequence and reward through resolution.</p>
        </div>
      </div>
      {isPrincipal && (
        <div className="tabs">
          <button
            className={tab === "queue" ? "active" : ""}
            onClick={() => setTab("queue")}
          >
            Pending queue{" "}
            <span>{records.filter((r) => r.status === "pending").length}</span>
          </button>
          <button
            className={tab === "catalog" ? "active" : ""}
            onClick={() => setTab("catalog")}
          >
            Catalog <span>{types.filter((t) => t.active).length}</span>
          </button>
        </div>
      )}
      {error && <p className="form-error discipline-error">{error}</p>}
      {tab === "catalog" && isPrincipal ? (
        <Catalog
          schoolId={schoolId}
          rows={types}
          setRows={setTypes}
          onError={setError}
        />
      ) : (
        <Queue
          schoolId={schoolId}
          userId={userId}
          isPrincipal={isPrincipal}
          types={types}
          students={initial.students}
          rows={records}
          setRows={setRecords}
          snoozeDays={initial.snoozeDays}
          snoozeCap={initial.snoozeCap}
          onError={setError}
        />
      )}
    </>
  );
}

function Catalog({
  schoolId,
  rows,
  setRows,
  onError,
}: {
  schoolId: string;
  rows: DisciplineType[];
  setRows: (v: DisciplineType[]) => void;
  onError: (v: string) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<"punishment" | "reward">(
    "punishment",
  );
  const [points, setPoints] = useState("0");
  const [fine, setFine] = useState(false);
  const [amount, setAmount] = useState("5");
  const [lateness, setLateness] = useState(false);
  const [min, setMin] = useState("15");
  const [max, setMax] = useState("");
  function begin(row: DisciplineType) {
    setEditing(row.id);
    setName(row.name);
    setDescription(row.description || "");
    setCategory(row.category);
    setPoints(String(row.points_value));
    setFine(row.is_fine);
    setAmount(String(row.base_amount || 5));
    setLateness(row.late_threshold_min !== null);
    setMin(String(row.late_threshold_min || 15));
    setMax(
      row.late_threshold_max === null ? "" : String(row.late_threshold_max),
    );
  }
  function reset() {
    setEditing(null);
    setName("");
    setDescription("");
    setCategory("punishment");
    setPoints("0");
    setFine(false);
    setLateness(false);
  }
  async function save() {
    onError("");
    const values = {
      name: name.trim(),
      description: description.trim() || null,
      category,
      points_value: Number(points) || 0,
      is_fine: fine,
      base_amount: fine ? Number(amount) || 0 : null,
      late_threshold_min: lateness ? Number(min) || 0 : null,
      late_threshold_max: lateness && max ? Number(max) : null,
    };
    const client = createClient();
    const query = editing
      ? client.from("punishment_types").update(values).eq("id", editing)
      : client.from("punishment_types").insert({
          school_id: schoolId,
          ...values,
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
    reset();
  }
  async function toggle(row: DisciplineType) {
    const { error } = await createClient()
      .from("punishment_types")
      .update({ active: !row.active })
      .eq("id", row.id);
    if (error) {
      onError(error.message);
      return;
    }
    setRows(
      rows.map((r) => (r.id === row.id ? { ...r, active: !r.active } : r)),
    );
  }
  return (
    <div className="setup-grid">
      <section className="card setup-form">
        <span className="setup-icon">
          <Scale />
        </span>
        <h2>{editing ? "Edit catalog item" : "Add catalog item"}</h2>
        <p>
          Create reusable teacher actions. Lateness-linked items are assigned
          automatically from attendance minutes.
        </p>
        <label>
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Late 15–24 min"
          />
        </label>
        <label>
          Description
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional explanation"
          />
        </label>
        <div className="field-pair">
          <label>
            Category
            <select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as "punishment" | "reward")
              }
            >
              <option value="punishment">Punishment</option>
              <option value="reward">Reward</option>
            </select>
          </label>
          <label>
            Points
            <input
              type="number"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
            />
          </label>
        </div>
        <label className="check-label">
          <input
            type="checkbox"
            checked={fine}
            onChange={(e) => setFine(e.target.checked)}
          />
          This is a fine
        </label>
        {fine && (
          <label>
            Base amount
            <input
              type="number"
              min="0"
              step=".01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
        )}
        <label className="check-label">
          <input
            type="checkbox"
            checked={lateness}
            onChange={(e) => setLateness(e.target.checked)}
          />
          Automatically assign from late minutes
        </label>
        {lateness && (
          <div className="field-pair">
            <label>
              Minimum minutes
              <input
                type="number"
                min="0"
                value={min}
                onChange={(e) => setMin(e.target.value)}
              />
            </label>
            <label>
              Maximum (optional)
              <input
                type="number"
                min="0"
                value={max}
                onChange={(e) => setMax(e.target.value)}
              />
            </label>
          </div>
        )}
        <div className="setup-form-actions">
          {editing && (
            <button className="secondary" onClick={reset}>
              <X />
              Cancel
            </button>
          )}
          <button className="primary" onClick={save} disabled={!name.trim()}>
            {editing ? <Pencil /> : <Plus />}
            {editing ? "Save item" : "Add item"}
          </button>
        </div>
      </section>
      <section className="card setup-list">
        <div className="card-head">
          <h2>Punishment & reward catalog</h2>
        </div>
        {rows.length ? (
          rows.map((row) => (
            <div
              className={`setup-row catalog-row ${row.active ? "" : "inactive"}`}
              key={row.id}
            >
              <span>
                {row.category === "reward" ? <Gift /> : <AlertTriangle />}
              </span>
              <div>
                <b>{row.name}</b>
                <small>
                  {row.category} ·{" "}
                  {row.is_fine
                    ? `$${Number(row.base_amount || 0).toFixed(2)}`
                    : `${row.points_value} points`}
                  {row.late_threshold_min !== null
                    ? ` · ${row.late_threshold_min}–${row.late_threshold_max ?? "∞"} min late`
                    : ""}
                </small>
              </div>
              <button className="tiny-primary" onClick={() => toggle(row)}>
                {row.active ? "Deactivate" : "Activate"}
              </button>
              <button
                className="icon-action"
                onClick={() => begin(row)}
                aria-label={`Edit ${row.name}`}
              >
                <Pencil />
              </button>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <Scale />
            <p>No catalog items yet. Add the first reusable action.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function Queue({
  schoolId,
  userId,
  isPrincipal,
  types,
  students,
  rows,
  setRows,
  snoozeDays,
  snoozeCap,
  onError,
}: {
  schoolId: string;
  userId: string;
  isPrincipal: boolean;
  types: DisciplineType[];
  students: DisciplineStudent[];
  rows: DisciplineRecord[];
  setRows: (v: DisciplineRecord[]) => void;
  snoozeDays: number;
  snoozeCap: number;
  onError: (v: string) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [studentId, setStudentId] = useState(students[0]?.id || "");
  const manualTypes = types.filter(
    (t) => t.active && t.late_threshold_min === null,
  );
  const [typeId, setTypeId] = useState(manualTypes[0]?.id || "");
  const [resolution, setResolution] = useState<{
    row: DisciplineRecord;
    kind: "exacted" | "waived";
  } | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");
  async function assign() {
    const type = types.find((t) => t.id === typeId);
    if (!type) return;
    onError("");
    const values = {
      student_id: studentId,
      punishment_type_id: typeId,
      base_amount: type.base_amount,
      current_amount: type.base_amount,
    };
    const client = createClient();
    const query = editing
      ? client.from("punishment_records").update(values).eq("id", editing)
      : client.from("punishment_records").insert({
          school_id: schoolId,
          ...values,
          assigned_by: userId,
          created_via: "manual",
          due_at: new Date(Date.now() + 86400000).toISOString(),
        });
    const { data, error } = await query.select("*").single();
    if (error) {
      onError(error.message);
      return;
    }
    setRows(
      editing
        ? rows.map((r) => (r.id === data.id ? data : r))
        : [data, ...rows],
    );
    setEditing(null);
  }
  function begin(row: DisciplineRecord) {
    setEditing(row.id);
    setStudentId(row.student_id);
    setTypeId(row.punishment_type_id);
  }
  async function remove(id: string) {
    const { error } = await createClient()
      .from("punishment_records")
      .delete()
      .eq("id", id);
    if (error) {
      onError(error.message);
      return;
    }
    setRows(rows.filter((r) => r.id !== id));
    if (editing === id) setEditing(null);
  }
  async function update(id: string, changes: Partial<DisciplineRecord>) {
    const { data, error } = await createClient()
      .from("punishment_records")
      .update(changes)
      .eq("id", id)
      .select("*")
      .single();
    if (error) {
      onError(error.message);
      return;
    }
    setRows(rows.map((r) => (r.id === id ? data : r)));
  }
  function exact(row: DisciplineRecord) {
    setResolution({ row, kind: "exacted" });
    setResolutionNote("");
  }
  function waive(row: DisciplineRecord) {
    setResolution({ row, kind: "waived" });
    setResolutionNote("");
  }
  async function confirmResolution() {
    if (!resolution || (resolution.kind === "waived" && !resolutionNote.trim()))
      return;
    await update(resolution.row.id, {
      status: resolution.kind,
      exacted_by: userId,
      exacted_at: new Date().toISOString(),
      exaction_notes: resolutionNote.trim() || null,
    });
    setResolution(null);
    setResolutionNote("");
  }
  async function snooze(row: DisciplineRecord) {
    const until = new Date(Date.now() + snoozeDays * 86400000);
    await update(row.id, {
      snoozed_until: until.toISOString(),
      snooze_count: row.snooze_count + 1,
    });
  }
  const pending = rows
    .filter((r) => r.status === "pending")
    .sort(
      (a, b) =>
        new Date(a.due_at || a.assigned_at).getTime() -
        new Date(b.due_at || b.assigned_at).getTime(),
    );
  return (
    <>
      {resolution && (
        <section
          className="card resolution-entry"
          role="dialog"
          aria-label="Resolve action"
        >
          <div>
            <b>
              {resolution.kind === "waived"
                ? "Waive action"
                : "Mark action exacted"}
            </b>
            <small>
              {resolution.kind === "waived"
                ? "A reason is required for the audit trail."
                : "Add optional completion notes."}
            </small>
          </div>
          <textarea
            autoFocus
            value={resolutionNote}
            onChange={(e) => setResolutionNote(e.target.value)}
            placeholder={
              resolution.kind === "waived"
                ? "Reason for waiving…"
                : "Optional notes…"
            }
          />
          <button className="secondary" onClick={() => setResolution(null)}>
            Cancel
          </button>
          <button
            className="primary"
            disabled={resolution.kind === "waived" && !resolutionNote.trim()}
            onClick={confirmResolution}
          >
            Confirm
          </button>
        </section>
      )}
      <section className="card discipline-assign">
        <div>
          <h2>{editing ? "Edit assigned action" : "Assign an action"}</h2>
          <p>
            Manual catalog actions are created pending for principal review.
          </p>
        </div>
        <label>
          Student
          <select
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Catalog item
          <select value={typeId} onChange={(e) => setTypeId(e.target.value)}>
            {manualTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        {editing && (
          <button className="secondary" onClick={() => setEditing(null)}>
            <X />
            Cancel
          </button>
        )}
        <button
          className="primary"
          disabled={!studentId || !typeId}
          onClick={assign}
        >
          {editing ? <Pencil /> : <Plus />}
          {editing ? "Save" : "Assign"}
        </button>
      </section>
      <div className="card table-card discipline-table">
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Action</th>
              <th>Assigned</th>
              <th>Due / snoozed</th>
              <th>Amount</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pending.length ? (
              pending.map((row) => {
                const type = types.find((t) => t.id === row.punishment_type_id);
                const student = students.find((s) => s.id === row.student_id);
                const capped = row.snooze_count >= snoozeCap;
                const canManage = isPrincipal || row.assigned_by === userId;
                return (
                  <tr key={row.id}>
                    <td>
                      <b>{student?.name || "Student"}</b>
                    </td>
                    <td>
                      <span
                        className={`status ${type?.category === "reward" ? "good" : "warn"}`}
                      >
                        {type?.name || "Action"}
                      </span>
                      {row.created_via === "auto_lateness" && (
                        <small className="auto-tag">Automatic lateness</small>
                      )}
                    </td>
                    <td>{new Date(row.assigned_at).toLocaleDateString()}</td>
                    <td>
                      {row.snoozed_until
                        ? `Snoozed to ${new Date(row.snoozed_until).toLocaleDateString()}`
                        : row.due_at
                          ? new Date(row.due_at).toLocaleDateString()
                          : "—"}
                    </td>
                    <td>
                      <b>
                        {type?.is_fine
                          ? `$${Number(row.current_amount || 0).toFixed(2)}`
                          : "—"}
                      </b>
                      {row.escalation_active && (
                        <small className="auto-tag">Escalating</small>
                      )}
                    </td>
                    <td>
                      <div className="discipline-actions">
                        {canManage && row.created_via === "manual" && (
                          <>
                            <button onClick={() => begin(row)}>
                              <Pencil />
                              Edit
                            </button>
                            <button onClick={() => remove(row.id)}>
                              <Trash2 />
                              Remove
                            </button>
                          </>
                        )}
                        {isPrincipal ? (
                          <div className="discipline-actions">
                            <button onClick={() => exact(row)}>Exact</button>
                            <button
                              disabled={capped}
                              title={capped ? "Snooze limit reached" : ""}
                              onClick={() => snooze(row)}
                            >
                              Snooze
                            </button>
                            <button onClick={() => waive(row)}>Waive</button>
                            {type?.is_fine && (
                              <button
                                className={
                                  row.escalation_active ? "active" : ""
                                }
                                onClick={() =>
                                  update(row.id, {
                                    escalation_active: !row.escalation_active,
                                    last_escalated_at: new Date().toISOString(),
                                  })
                                }
                              >
                                <TimerReset />{" "}
                                {row.escalation_active ? "Stop" : "Escalate"}
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="status warn">Pending principal</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6}>
                  <div className="empty-table">
                    <Scale />
                    <b>No pending actions</b>
                    <span>The queue is clear.</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
