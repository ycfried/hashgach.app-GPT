"use client";

import { useState } from "react";
import { Check, ChevronRight, Clock3, Pencil, Plus, ShieldCheck, Trash2, Users, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type AttendanceStudent = { id: string; name: string };
export type AttendanceOffering = { id: string; className: string; subject: string; periodName: string; startTime: string; endTime: string; studentIds: string[] };
export type AttendanceRecord = { id: string; studentId: string; status: "present" | "late" | "absent" | "excused"; lateMinutes: number | null };
export type AttendanceSession = { id: string; offeringId: string; status: "active" | "completed"; startTime: string; records: AttendanceRecord[] };
export type ExcusalRecord = { id: string; student_id: string; scope: "single_class" | "all_classes"; class_offering_id: string | null; start_date: string; end_date: string | null; reason: string | null; active: boolean };
export type AttendanceBundle = { students: AttendanceStudent[]; offerings: AttendanceOffering[]; sessions: AttendanceSession[]; excusals: ExcusalRecord[] };

const options = ["present", "late", "absent", "excused"] as const;
const labels = { present: "Present", late: "Late", absent: "Absent", excused: "Excused" };
const today = () => new Date().toISOString().slice(0, 10);
const time = (value: string) => { const [h, m] = value.split(":"); const n = Number(h); return `${n % 12 || 12}:${m} ${n >= 12 ? "PM" : "AM"}`; };

export default function AttendanceView({ schoolId, userId, isPrincipal, initial }: { schoolId: string; userId: string; isPrincipal: boolean; initial: AttendanceBundle }) {
  const [sessions, setSessions] = useState(initial.sessions);
  const [excusals, setExcusals] = useState(initial.excusals);
  const [selected, setSelected] = useState(initial.sessions.find((s) => s.status === "active")?.offeringId || "");
  const [showExclusions, setShowExclusions] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [lateTarget, setLateTarget] = useState<string | null>(null);
  const [lateValue, setLateValue] = useState("5");
  const offering = initial.offerings.find((o) => o.id === selected);
  const session = sessions.find((s) => s.offeringId === selected);
  const roster = offering ? initial.students.filter((s) => offering.studentIds.includes(s.id)) : [];

  function applicableExcusal(studentId: string, offeringId: string) {
    const date = today();
    return excusals.find((e) => e.active && e.student_id === studentId && e.start_date <= date && (!e.end_date || e.end_date >= date) && (e.scope === "all_classes" || e.class_offering_id === offeringId));
  }

  async function start(offeringId: string) {
    setBusy(true); setError("");
    const now = new Date();
    const local = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:00`;
    const client = createClient();
    const { data, error } = await client.from("attendance_sessions").insert({ school_id: schoolId, class_offering_id: offeringId, actual_start_time: local, started_by: userId }).select("id,class_offering_id,status,actual_start_time").single();
    if (error) { setError(error.message); setBusy(false); return; }
    const studentIds = initial.offerings.find((o) => o.id === offeringId)?.studentIds || [];
    const defaults = studentIds.filter((id) => applicableExcusal(id, offeringId)).map((studentId) => ({ school_id: schoolId, attendance_session_id: data.id, student_id: studentId, status: "excused" as const, late_minutes: null, updated_by: userId }));
    let records: AttendanceRecord[] = [];
    if (defaults.length) {
      const result = await client.from("attendance_records").upsert(defaults, { onConflict: "attendance_session_id,student_id" }).select("id,student_id,status,late_minutes");
      if (result.error) setError(`Class started, but excusals could not be prefilled: ${result.error.message}`);
      records = (result.data || []).map((r) => ({ id: r.id, studentId: r.student_id, status: r.status, lateMinutes: r.late_minutes }));
    }
    setSessions([...sessions, { id: data.id, offeringId: data.class_offering_id, status: data.status, startTime: data.actual_start_time, records }]);
    setSelected(offeringId); setBusy(false);
  }

  async function persistMark(studentId: string, status: (typeof options)[number], lateMinutes: number | null = null) {
    if (!session) return;
    setError("");
    const payload = { school_id: schoolId, attendance_session_id: session.id, student_id: studentId, status, late_minutes: lateMinutes, updated_by: userId };
    const { data, error } = await createClient().from("attendance_records").upsert(payload, { onConflict: "attendance_session_id,student_id" }).select("id,student_id,status,late_minutes").single();
    if (error) { setError(error.message); return; }
    setSessions(sessions.map((s) => s.id === session.id ? { ...s, records: [...s.records.filter((r) => r.studentId !== studentId), { id: data.id, studentId: data.student_id, status: data.status, lateMinutes: data.late_minutes }] } : s));
    setLateTarget(null);
  }
  function mark(studentId: string, status: (typeof options)[number]) { if (status === "late") { setLateTarget(studentId); setLateValue(String(session?.records.find((r) => r.studentId === studentId)?.lateMinutes || 5)); return; } void persistMark(studentId, status); }
  async function markAll() { if (!session || !roster.length) return; setBusy(true); const payload = roster.map((student) => ({ school_id: schoolId, attendance_session_id: session.id, student_id: student.id, status: "present" as const, late_minutes: null, updated_by: userId })); const { data, error } = await createClient().from("attendance_records").upsert(payload, { onConflict: "attendance_session_id,student_id" }).select("id,student_id,status,late_minutes"); if (error) { setError(error.message); setBusy(false); return; } setSessions(sessions.map((s) => s.id === session.id ? { ...s, records: (data || []).map((r) => ({ id: r.id, studentId: r.student_id, status: r.status, lateMinutes: r.late_minutes })) } : s)); setBusy(false); }
  async function complete() { if (!session) return; setBusy(true); const now = new Date(); const local = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:00`; const { error } = await createClient().from("attendance_sessions").update({ status: "completed", actual_end_time: local }).eq("id", session.id); if (error) { setError(error.message); setBusy(false); return; } setSessions(sessions.map((s) => s.id === session.id ? { ...s, status: "completed" } : s)); setSelected(""); setBusy(false); }

  if (showExclusions && isPrincipal) return <ExcusalManager schoolId={schoolId} userId={userId} students={initial.students} offerings={initial.offerings} rows={excusals} setRows={setExcusals} onClose={() => setShowExclusions(false)} />;
  if (offering && session?.status === "active") return <><div className="page-title"><div><h1>Live attendance</h1><p>Attendance only counts after a class is started.</p></div></div>{error && <p className="form-error attendance-error">{error}</p>}{lateTarget && <section className="card late-entry" role="dialog" aria-label="Record late arrival"><div><b>How many minutes late?</b><small>{initial.students.find((s) => s.id === lateTarget)?.name}</small></div><input type="number" min="0" autoFocus value={lateValue} onChange={(e) => setLateValue(e.target.value)} /><button className="secondary" onClick={() => setLateTarget(null)}>Cancel</button><button className="primary" onClick={() => persistMark(lateTarget, "late", Math.max(0, Number(lateValue) || 0))}>Save late mark</button></section>}<div className="card live-roster"><div className="live-head"><div><span className="live-label"><i /> LIVE CLASS</span><h2>{offering.className}</h2><p>{offering.periodName} · Started {time(session.startTime)} · {roster.length} students</p></div><button className="secondary" disabled={busy} onClick={complete}>Complete class</button></div><button className="mark-all" disabled={busy || !roster.length} onClick={markAll}><Check /> Mark all present</button>{roster.length ? roster.map((student) => { const record = session.records.find((r) => r.studentId === student.id); const excusal = applicableExcusal(student.id, offering.id); return <div className="roster-row" key={student.id}><div className="person"><span className="avatar small">{student.name.split(" ").map((n) => n[0]).join("")}</span><span><b>{student.name}</b>{excusal && <small>Principal excusal{excusal.reason ? ` · ${excusal.reason}` : ""}{excusal.end_date ? ` · through ${new Date(`${excusal.end_date}T12:00:00`).toLocaleDateString()}` : " · ongoing"}</small>}</span></div><div className="segmented">{options.map((option) => <button key={option} className={record?.status === option ? `selected ${option}` : ""} onClick={() => mark(student.id, option)}>{labels[option]}{option === "late" && record?.status === "late" ? ` · ${record.lateMinutes}m` : ""}</button>)}</div></div>; }) : <div className="empty-state"><Users /><p>No students are assigned to this period yet. Add them under Setup → Assignments.</p></div>}</div></>;
  return <><div className="page-title"><div><h1>Today’s classes</h1><p>{new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date())} · {initial.offerings.length} scheduled blocks</p></div>{isPrincipal && <button className="secondary" onClick={() => setShowExclusions(true)}><ShieldCheck /> Manage excusals</button>}</div>{error && <p className="form-error attendance-error">{error}</p>}<div className="class-list">{initial.offerings.length ? initial.offerings.map((o) => { const existing = sessions.find((s) => s.offeringId === o.id); return <div className="card class-card" key={o.id}><div className="class-time"><Clock3 /><b>{time(o.startTime)}–{time(o.endTime)}</b></div><div><h3>{o.className}</h3><p>{o.subject} · {o.studentIds.length} students · {o.periodName}</p></div>{existing?.status === "completed" ? <span className="status good">Completed</span> : existing ? <button className="primary" onClick={() => setSelected(o.id)}>Resume <ChevronRight size={17} /></button> : <button className="primary" disabled={busy} onClick={() => start(o.id)}>Start class <ChevronRight size={17} /></button>}</div>; }) : <div className="card empty-state"><Clock3 /><p>No class offerings are scheduled for today. A principal can create them in Setup.</p></div>}</div></>;
}

function ExcusalManager({ schoolId, userId, students, offerings, rows, setRows, onClose }: { schoolId: string; userId: string; students: AttendanceStudent[]; offerings: AttendanceOffering[]; rows: ExcusalRecord[]; setRows: (rows: ExcusalRecord[]) => void; onClose: () => void }) {
  const [editing, setEditing] = useState<string | null>(null); const [student, setStudent] = useState(students[0]?.id || ""); const [scope, setScope] = useState<"single_class" | "all_classes">("all_classes"); const [offering, setOffering] = useState(offerings[0]?.id || ""); const [start, setStart] = useState(today()); const [end, setEnd] = useState(""); const [reason, setReason] = useState(""); const [error, setError] = useState("");
  function reset() { setEditing(null); setStudent(students[0]?.id || ""); setScope("all_classes"); setOffering(offerings[0]?.id || ""); setStart(today()); setEnd(""); setReason(""); }
  function begin(row: ExcusalRecord) { setEditing(row.id); setStudent(row.student_id); setScope(row.scope); setOffering(row.class_offering_id || offerings[0]?.id || ""); setStart(row.start_date); setEnd(row.end_date || ""); setReason(row.reason || ""); }
  async function save() { setError(""); const values = { student_id: student, scope, class_offering_id: scope === "single_class" ? offering : null, start_date: start, end_date: end || null, reason: reason.trim() || null, active: true }; const query = editing ? createClient().from("excusal_records").update(values).eq("id", editing) : createClient().from("excusal_records").insert({ school_id: schoolId, created_by: userId, ...values }); const { data, error } = await query.select("id,student_id,scope,class_offering_id,start_date,end_date,reason,active").single(); if (error) { setError(error.message); return; } setRows(editing ? rows.map((r) => r.id === data.id ? data : r) : [data, ...rows]); reset(); }
  async function remove(id: string) { const { error } = await createClient().from("excusal_records").update({ active: false }).eq("id", id); if (error) { setError(error.message); return; } setRows(rows.map((r) => r.id === id ? { ...r, active: false } : r)); }
  const active = rows.filter((r) => r.active);
  return <><div className="page-title"><div><p className="eyebrow">Principal controls</p><h1>Attendance excusals</h1><p>Set a standing class exemption or excuse all classes for a date range.</p></div><button className="secondary" onClick={onClose}><X /> Back to attendance</button></div>{error && <p className="form-error">{error}</p>}<div className="setup-grid"><section className="card setup-form"><span className="setup-icon"><ShieldCheck /></span><h2>{editing ? "Edit excusal" : "Add an excusal"}</h2><label>Student<select value={student} onChange={(e) => setStudent(e.target.value)}>{students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>Scope<select value={scope} onChange={(e) => setScope(e.target.value as typeof scope)}><option value="all_classes">All classes</option><option value="single_class">One class</option></select></label>{scope === "single_class" && <label>Class<select value={offering} onChange={(e) => setOffering(e.target.value)}>{offerings.map((o) => <option key={o.id} value={o.id}>{o.className} · {o.periodName}</option>)}</select></label>}<div className="field-pair"><label>Starts<input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></label><label>Ends (optional)<input type="date" min={start} value={end} onChange={(e) => setEnd(e.target.value)} /></label></div><label>Reason (optional)<textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Family emergency, medical exemption…" /></label><div className="setup-form-actions">{editing && <button className="secondary" onClick={reset}><X /> Cancel</button>}<button className="primary" disabled={!student || !start || (scope === "single_class" && !offering) || (!!end && end < start)} onClick={save}>{editing ? <Pencil /> : <Plus />}{editing ? "Save excusal" : "Add excusal"}</button></div></section><section className="card setup-list"><div className="card-head"><h2>Active excusals</h2></div>{active.length ? active.map((r) => <div className="setup-row" key={r.id}><span><ShieldCheck /></span><div><b>{students.find((s) => s.id === r.student_id)?.name}</b><small>{r.scope === "all_classes" ? "All classes" : offerings.find((o) => o.id === r.class_offering_id)?.className || "Class"} · {r.start_date}{r.end_date ? `–${r.end_date}` : " onward"}{r.reason ? ` · ${r.reason}` : ""}</small></div><button className="icon-action" onClick={() => begin(r)} aria-label="Edit excusal"><Pencil /></button><button className="icon-action danger" onClick={() => remove(r.id)} aria-label="End excusal"><Trash2 /></button></div>) : <div className="empty-state"><ShieldCheck /><p>No active excusals.</p></div>}</section></div></>;
}
