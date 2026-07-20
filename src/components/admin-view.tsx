"use client";

import { useMemo, useState } from "react";
import { Download, FileClock, Save, Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Audit = {
  id: number;
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  occurred_at: string;
  before_value: unknown;
  after_value: unknown;
};
export type AdminBundle = {
  schoolName: string;
  settings: Record<string, unknown>;
  staff: { id: string; name: string }[];
  audit: Audit[];
  students: Record<string, unknown>[];
  grades: Record<string, unknown>[];
  attendance: Record<string, unknown>[];
  discipline: Record<string, unknown>[];
};

export default function AdminView({
  schoolId,
  initial,
}: {
  schoolId: string;
  initial: AdminBundle;
}) {
  const [tab, setTab] = useState<"policy" | "audit" | "export">("policy");
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">Principal administration</p>
          <h1>Settings & data</h1>
          <p>
            Control school policy, review attributed changes, and keep portable
            backups.
          </p>
        </div>
      </div>
      <div className="setup-tabs">
        <button
          className={tab === "policy" ? "active" : ""}
          onClick={() => setTab("policy")}
        >
          <Settings />
          Policy settings
        </button>
        <button
          className={tab === "audit" ? "active" : ""}
          onClick={() => setTab("audit")}
        >
          <FileClock />
          Audit log <span>{initial.audit.length}</span>
        </button>
        <button
          className={tab === "export" ? "active" : ""}
          onClick={() => setTab("export")}
        >
          <Download />
          Data export
        </button>
      </div>
      {tab === "policy" ? (
        <Policy schoolId={schoolId} initial={initial.settings} />
      ) : tab === "audit" ? (
        <AuditLog initial={initial} />
      ) : (
        <Exports initial={initial} />
      )}
    </>
  );
}

function Policy({
  schoolId,
  initial,
}: {
  schoolId: string;
  initial: Record<string, unknown>;
}) {
  const [snoozeDays, setSnoozeDays] = useState(
    Number(initial.snooze_days || 1),
  );
  const [snoozeCap, setSnoozeCap] = useState(Number(initial.snooze_cap || 3));
  const [rate, setRate] = useState(
    Number(initial.escalation_rate || 0.05) * 100,
  );
  const [interval, setInterval] = useState(
    Number(initial.escalation_interval_days || 1),
  );
  const [mode, setMode] = useState(
    String(initial.report_card_mode || "numeric"),
  );
  const [notice, setNotice] = useState("");
  async function save() {
    const next = {
      ...initial,
      snooze_days: snoozeDays,
      snooze_cap: snoozeCap,
      escalation_rate: rate / 100,
      escalation_interval_days: interval,
      report_card_mode: mode,
    };
    const { error } = await createClient()
      .from("schools")
      .update({ settings: next })
      .eq("id", schoolId);
    setNotice(error ? error.message : "Policy settings saved.");
  }
  return (
    <section className="card policy-card">
      <div className="card-head">
        <h2>School-wide defaults</h2>
      </div>
      <div className="policy-grid">
        <label>
          Default snooze (days)
          <input
            type="number"
            min="1"
            value={snoozeDays}
            onChange={(e) => setSnoozeDays(Number(e.target.value))}
          />
        </label>
        <label>
          Maximum snoozes
          <input
            type="number"
            min="0"
            value={snoozeCap}
            onChange={(e) => setSnoozeCap(Number(e.target.value))}
          />
        </label>
        <label>
          Fine escalation (%)
          <input
            type="number"
            min="0"
            step=".1"
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
          />
        </label>
        <label>
          Escalation interval (days)
          <input
            type="number"
            min="1"
            value={interval}
            onChange={(e) => setInterval(Number(e.target.value))}
          />
        </label>
        <label>
          Report-card marks
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="numeric">Numeric</option>
            <option value="letter">Letter grades</option>
          </select>
        </label>
      </div>
      <div className="policy-save">
        {notice && (
          <span className={notice.includes("saved") ? "save-ok" : "form-error"}>
            {notice}
          </span>
        )}
        <button className="primary" onClick={save}>
          <Save />
          Save policy
        </button>
      </div>
    </section>
  );
}

function AuditLog({ initial }: { initial: AdminBundle }) {
  const [query, setQuery] = useState("");
  const rows = useMemo(
    () =>
      initial.audit.filter((a) =>
        `${a.action} ${a.entity_type} ${initial.staff.find((s) => s.id === a.actor_id)?.name}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [initial, query],
  );
  return (
    <>
      <div className="toolbar">
        <div className="searchbox">
          <FileClock />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search audit history…"
          />
        </div>
      </div>
      <div className="card table-card">
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Record</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((a) => (
                <tr key={a.id}>
                  <td>{new Date(a.occurred_at).toLocaleString()}</td>
                  <td>
                    <b>
                      {initial.staff.find((s) => s.id === a.actor_id)?.name ||
                        "Principal"}
                    </b>
                  </td>
                  <td>
                    <span className="status info">{a.action}</span>
                  </td>
                  <td>{a.entity_type.replaceAll("_", " ")}</td>
                  <td>
                    <code>{summarize(a.before_value, a.after_value)}</code>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5}>
                  <div className="empty-table">
                    <FileClock />
                    <b>No matching audit events</b>
                    <span>Future principal changes appear automatically.</span>
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

function summarize(before: unknown, after: unknown) {
  const b = (before || {}) as Record<string, unknown>;
  const a = (after || {}) as Record<string, unknown>;
  const changed = [...new Set([...Object.keys(b), ...Object.keys(a)])].filter(
    (k) =>
      JSON.stringify(b[k]) !== JSON.stringify(a[k]) &&
      !["updated_at", "created_at"].includes(k),
  );
  return changed.slice(0, 4).join(", ") || "record changed";
}
function Exports({ initial }: { initial: AdminBundle }) {
  const sets = [
    { name: "Students", rows: initial.students },
    { name: "Attendance", rows: initial.attendance },
    { name: "Grades", rows: initial.grades },
    { name: "Discipline", rows: initial.discipline },
  ];
  function download(name: string, rows: Record<string, unknown>[]) {
    if (!rows.length) return;
    const headers = [...new Set(rows.flatMap(Object.keys))];
    const quote = (v: unknown) => `"${String(v ?? "").replaceAll('"', '""')}"`;
    const csv = [
      headers.map(quote).join(","),
      ...rows.map((r) => headers.map((h) => quote(r[h])).join(",")),
    ].join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `hashgacha-${name.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="export-grid">
      {sets.map((s) => (
        <article className="card export-card" key={s.name}>
          <Download />
          <div>
            <h2>{s.name}</h2>
            <p>{s.rows.length} records · CSV format</p>
          </div>
          <button
            className="secondary"
            disabled={!s.rows.length}
            onClick={() => download(s.name, s.rows)}
          >
            Download CSV
          </button>
        </article>
      ))}
    </div>
  );
}
