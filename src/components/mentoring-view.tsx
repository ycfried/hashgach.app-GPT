"use client";

import { useState } from "react";
import {
  Check,
  Clock3,
  MessageCircle,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type MentorAssignment = {
  id: string;
  mentor_id: string;
  student_id: string;
  source: "from_grade" | "manual_override";
  contact_interval_days: number | null;
  flagged: boolean;
};
export type MentorConversation = {
  id: string;
  mentor_id: string;
  student_id: string;
  conversation_date: string;
  status: "ongoing" | "completed";
  notes: string | null;
  shared_with_principal: boolean;
  created_at: string;
};
export type NoteRequest = {
  id: string;
  principal_id: string;
  mentor_id: string;
  student_id: string;
  requested_at: string;
  requested_duration_days: number;
  status: "pending" | "accepted" | "denied";
  expires_at: string | null;
  ended_early_at: string | null;
};
export type StatsRequest = {
  id: string;
  mentor_id: string;
  requested_at: string;
  status: "pending" | "approved" | "denied";
  expires_at: string | null;
  revoked_at: string | null;
};
export type MentoringBundle = {
  assignments: MentorAssignment[];
  conversations: MentorConversation[];
  noteRequests: NoteRequest[];
  statsRequests: StatsRequest[];
  students: { id: string; name: string; year: string }[];
  mentors: { id: string; name: string }[];
};

export default function MentoringView({
  schoolId,
  userId,
  isPrincipal,
  isMashpia,
  initial,
}: {
  schoolId: string;
  userId: string;
  isPrincipal: boolean;
  isMashpia: boolean;
  initial: MentoringBundle;
}) {
  const [tab, setTab] = useState<"students" | "conversations" | "requests">(
    "students",
  );
  const [assignments, setAssignments] = useState(initial.assignments);
  const [conversations, setConversations] = useState(initial.conversations);
  const [noteRequests, setNoteRequests] = useState(initial.noteRequests);
  const [statsRequests, setStatsRequests] = useState(initial.statsRequests);
  const [error, setError] = useState("");
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">Mashpia relationships</p>
          <h1>Mentoring</h1>
          <p>
            Keep every student connected while protecting private conversation
            notes.
          </p>
        </div>
      </div>
      <div className="setup-tabs">
        <button
          className={tab === "students" ? "active" : ""}
          onClick={() => setTab("students")}
        >
          <Users />
          Assigned students <span>{assignments.length}</span>
        </button>
        <button
          className={tab === "conversations" ? "active" : ""}
          onClick={() => setTab("conversations")}
        >
          <MessageCircle />
          Conversations <span>{conversations.length}</span>
        </button>
        <button
          className={tab === "requests" ? "active" : ""}
          onClick={() => setTab("requests")}
        >
          <ShieldCheck />
          Requests{" "}
          <span>
            {noteRequests.filter((r) => r.status === "pending").length +
              statsRequests.filter((r) => r.status === "pending").length}
          </span>
        </button>
      </div>
      {error && <p className="form-error setup-error">{error}</p>}
      {tab === "students" ? (
        <Assignments
          schoolId={schoolId}
          isPrincipal={isPrincipal}
          rows={assignments}
          setRows={setAssignments}
          students={initial.students}
          mentors={initial.mentors}
          onError={setError}
        />
      ) : tab === "conversations" ? (
        <Conversations
          schoolId={schoolId}
          userId={userId}
          canCreate={isMashpia}
          assignments={assignments}
          rows={conversations}
          setRows={setConversations}
          students={initial.students}
          onError={setError}
        />
      ) : (
        <Requests
          schoolId={schoolId}
          userId={userId}
          isPrincipal={isPrincipal}
          isMashpia={isMashpia}
          assignments={assignments}
          mentors={initial.mentors}
          students={initial.students}
          notes={noteRequests}
          setNotes={setNoteRequests}
          stats={statsRequests}
          setStats={setStatsRequests}
          onError={setError}
        />
      )}
    </>
  );
}

function Assignments({
  schoolId,
  isPrincipal,
  rows,
  setRows,
  students,
  mentors,
  onError,
}: {
  schoolId: string;
  isPrincipal: boolean;
  rows: MentorAssignment[];
  setRows: (v: MentorAssignment[]) => void;
  students: MentoringBundle["students"];
  mentors: MentoringBundle["mentors"];
  onError: (v: string) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [student, setStudent] = useState(students[0]?.id || "");
  const [mentor, setMentor] = useState(mentors[0]?.id || "");
  const [interval, setInterval] = useState("14");
  function begin(r: MentorAssignment) {
    setEditing(r.id);
    setStudent(r.student_id);
    setMentor(r.mentor_id);
    setInterval(String(r.contact_interval_days || 14));
  }
  function reset() {
    setEditing(null);
    setStudent(students[0]?.id || "");
    setMentor(mentors[0]?.id || "");
    setInterval("14");
  }
  async function save() {
    const client = createClient();
    const values = {
      school_id: schoolId,
      mentor_id: mentor,
      student_id: student,
      source: "manual_override",
      contact_interval_days: Number(interval),
    };
    const query = editing
      ? client.from("mentor_assignments").update(values).eq("id", editing)
      : client
          .from("mentor_assignments")
          .upsert(values, { onConflict: "mentor_id,student_id" });
    const { data, error } = await query.select("*").single();
    if (error) {
      onError(error.message);
      return;
    }
    setRows(
      editing
        ? rows.map((r) => (r.id === data.id ? data : r))
        : [...rows.filter((r) => r.id !== data.id), data],
    );
    reset();
  }
  async function remove(id: string) {
    const { error } = await createClient()
      .from("mentor_assignments")
      .delete()
      .eq("id", id);
    if (error) {
      onError(error.message);
      return;
    }
    setRows(rows.filter((r) => r.id !== id));
    if (editing === id) reset();
  }
  return (
    <>
      {isPrincipal && (
        <section className="card mentoring-action">
          <div>
            <h2>{editing ? "Edit mashpia assignment" : "Assign a mashpia"}</h2>
            <p>
              Individual overrides remain independent of class or grade
              defaults.
            </p>
          </div>
          <label>
            Student
            <select
              value={student}
              onChange={(e) => setStudent(e.target.value)}
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.year}
                </option>
              ))}
            </select>
          </label>
          <label>
            Mashpia
            <select value={mentor} onChange={(e) => setMentor(e.target.value)}>
              {mentors.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Contact every
            <input
              type="number"
              min="1"
              value={interval}
              onChange={(e) => setInterval(e.target.value)}
            />
            <small>days</small>
          </label>
          {editing && (
            <button className="secondary" onClick={reset}>
              <X />
              Cancel
            </button>
          )}
          <button
            className="primary"
            disabled={!student || !mentor}
            onClick={save}
          >
            {editing ? <Pencil /> : <Plus />}
            {editing ? "Save" : "Assign"}
          </button>
        </section>
      )}
      <div className="card table-card">
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Mashpia</th>
              <th>Contact interval</th>
              <th>Source</th>
              <th>Status</th>
              {isPrincipal && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <b>
                      {students.find((s) => s.id === r.student_id)?.name ||
                        "Student"}
                    </b>
                  </td>
                  {isPrincipal && (
                    <td>
                      <div className="row-actions">
                        <button className="icon-btn" onClick={() => begin(r)}>
                          <Pencil />
                          Edit
                        </button>
                        <button
                          className="icon-btn danger"
                          onClick={() => remove(r.id)}
                        >
                          <Trash2 />
                          Remove
                        </button>
                      </div>
                    </td>
                  )}
                  <td>
                    {mentors.find((m) => m.id === r.mentor_id)?.name ||
                      "Mashpia"}
                  </td>
                  <td>{r.contact_interval_days || 14} days</td>
                  <td>
                    {r.source === "manual_override"
                      ? "Individual override"
                      : "Grade default"}
                  </td>
                  <td>
                    <span className={`status ${r.flagged ? "bad" : "good"}`}>
                      {r.flagged ? "Needs attention" : "On track"}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={isPrincipal ? 6 : 5}>
                  <div className="empty-table">
                    <Users />
                    <b>No mentor assignments</b>
                    <span>
                      {mentors.length
                        ? "Assign a mashpia to begin."
                        : "Invite a staff member with the Mashpia role first."}
                    </span>
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

function Conversations({
  schoolId,
  userId,
  canCreate,
  assignments,
  rows,
  setRows,
  students,
  onError,
}: {
  schoolId: string;
  userId: string;
  canCreate: boolean;
  assignments: MentorAssignment[];
  rows: MentorConversation[];
  setRows: (v: MentorConversation[]) => void;
  students: MentoringBundle["students"];
  onError: (v: string) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const mine = assignments.filter((a) => a.mentor_id === userId);
  const [student, setStudent] = useState(mine[0]?.student_id || "");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"ongoing" | "completed">("completed");
  const [share, setShare] = useState(false);
  function begin(r: MentorConversation) {
    setEditing(r.id);
    setStudent(r.student_id);
    setNotes(r.notes || "");
    setStatus(r.status);
    setShare(r.shared_with_principal);
  }
  function reset() {
    setEditing(null);
    setStudent(mine[0]?.student_id || "");
    setNotes("");
    setStatus("completed");
    setShare(false);
  }
  async function save() {
    const client = createClient();
    const values = {
      student_id: student,
      status,
      notes: notes.trim() || null,
      shared_with_principal: share,
    };
    const query = editing
      ? client.from("mentor_conversations").update(values).eq("id", editing)
      : client.from("mentor_conversations").insert({
          school_id: schoolId,
          mentor_id: userId,
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
        : [data, ...rows],
    );
    reset();
  }
  async function remove(id: string) {
    const { error } = await createClient()
      .from("mentor_conversations")
      .delete()
      .eq("id", id);
    if (error) {
      onError(error.message);
      return;
    }
    setRows(rows.filter((r) => r.id !== id));
    if (editing === id) reset();
  }
  return (
    <>
      {canCreate && (
        <section className="card conversation-form">
          <h2>{editing ? "Edit conversation" : "Record a conversation"}</h2>
          <label>
            Student
            <select
              value={student}
              onChange={(e) => setStudent(e.target.value)}
            >
              {mine.map((a) => (
                <option key={a.id} value={a.student_id}>
                  {students.find((s) => s.id === a.student_id)?.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
            >
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
            </select>
          </label>
          <label className="conversation-notes">
            Private notes
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional conversation notes"
            />
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              checked={share}
              onChange={(e) => setShare(e.target.checked)}
            />
            Share this note with principal
          </label>
          {editing && (
            <button className="secondary" onClick={reset}>
              <X />
              Cancel
            </button>
          )}
          <button className="primary" disabled={!student} onClick={save}>
            {editing ? <Pencil /> : <Plus />}
            {editing ? "Save changes" : "Save conversation"}
          </button>
        </section>
      )}
      <div className="conversation-grid">
        {rows.length ? (
          rows.map((r) => (
            <article className="card conversation-card" key={r.id}>
              <div>
                <span
                  className={`status ${r.status === "completed" ? "good" : "warn"}`}
                >
                  {r.status}
                </span>
                <time>
                  {new Date(
                    r.conversation_date + "T00:00",
                  ).toLocaleDateString()}
                </time>
              </div>
              <h3>
                {students.find((s) => s.id === r.student_id)?.name || "Student"}
              </h3>
              <p>{r.notes || "No notes recorded."}</p>
              {r.shared_with_principal && (
                <small>
                  <ShieldCheck /> Shared with principal
                </small>
              )}
              {r.mentor_id === userId && (
                <div className="row-actions">
                  <button className="icon-btn" onClick={() => begin(r)}>
                    <Pencil />
                    Edit
                  </button>
                  <button
                    className="icon-btn danger"
                    onClick={() => remove(r.id)}
                  >
                    <Trash2 />
                    Remove
                  </button>
                </div>
              )}
            </article>
          ))
        ) : (
          <div className="card empty-state">
            <MessageCircle />
            <p>No visible conversations yet.</p>
          </div>
        )}
      </div>
    </>
  );
}

function Requests({
  schoolId,
  userId,
  isPrincipal,
  isMashpia,
  assignments,
  mentors,
  students,
  notes,
  setNotes,
  stats,
  setStats,
  onError,
}: {
  schoolId: string;
  userId: string;
  isPrincipal: boolean;
  isMashpia: boolean;
  assignments: MentorAssignment[];
  mentors: MentoringBundle["mentors"];
  students: MentoringBundle["students"];
  notes: NoteRequest[];
  setNotes: (v: NoteRequest[]) => void;
  stats: StatsRequest[];
  setStats: (v: StatsRequest[]) => void;
  onError: (v: string) => void;
}) {
  const [assignment, setAssignment] = useState(assignments[0]?.id || "");
  async function requestNotes() {
    const a = assignments.find((x) => x.id === assignment);
    if (!a) return;
    const { data, error } = await createClient()
      .from("note_requests")
      .insert({
        school_id: schoolId,
        principal_id: userId,
        mentor_id: a.mentor_id,
        student_id: a.student_id,
        requested_scope: "all",
        requested_duration_days: 7,
      })
      .select("*")
      .single();
    if (error) {
      onError(error.message);
      return;
    }
    setNotes([data, ...notes]);
  }
  async function requestStats() {
    const { data, error } = await createClient()
      .from("stats_access_requests")
      .insert({ school_id: schoolId, mentor_id: userId })
      .select("*")
      .single();
    if (error) {
      onError(error.message);
      return;
    }
    setStats([data, ...stats]);
  }
  async function updateNote(row: NoteRequest, status: "accepted" | "denied") {
    const expires =
      status === "accepted"
        ? new Date(
            new Date(row.requested_at).getTime() +
              row.requested_duration_days * 86400000,
          ).toISOString()
        : null;
    const { data, error } = await createClient()
      .from("note_requests")
      .update({
        status,
        granted_scope: "all",
        granted_type: "snapshot",
        expires_at: expires,
      })
      .eq("id", row.id)
      .select("*")
      .single();
    if (error) {
      onError(error.message);
      return;
    }
    setNotes(notes.map((r) => (r.id === row.id ? data : r)));
  }
  async function updateStats(row: StatsRequest, status: "approved" | "denied") {
    const responded = new Date(row.requested_at).toISOString();
    const { data, error } = await createClient()
      .from("stats_access_requests")
      .update({
        status,
        principal_id: userId,
        responded_at: responded,
        expires_at:
          status === "approved"
            ? new Date(
                new Date(row.requested_at).getTime() + 30 * 86400000,
              ).toISOString()
            : null,
      })
      .eq("id", row.id)
      .select("*")
      .single();
    if (error) {
      onError(error.message);
      return;
    }
    setStats(stats.map((r) => (r.id === row.id ? data : r)));
  }
  return (
    <>
      <div className="request-actions">
        {isPrincipal && (
          <section className="card request-create">
            <ShieldCheck />
            <div>
              <h2>Request mentor notes</h2>
              <p>Temporary access is granted only if the mashpia accepts.</p>
            </div>
            <select
              value={assignment}
              onChange={(e) => setAssignment(e.target.value)}
            >
              {assignments.map((a) => (
                <option key={a.id} value={a.id}>
                  {students.find((s) => s.id === a.student_id)?.name} ·{" "}
                  {mentors.find((m) => m.id === a.mentor_id)?.name}
                </option>
              ))}
            </select>
            <button
              className="primary"
              disabled={!assignment}
              onClick={requestNotes}
            >
              Send request
            </button>
          </section>
        )}
        {isMashpia && (
          <section className="card request-create">
            <ShieldCheck />
            <div>
              <h2>Request cross-class stats</h2>
              <p>Does not include private mentor notes.</p>
            </div>
            <button className="primary" onClick={requestStats}>
              Request access
            </button>
          </section>
        )}
      </div>
      <div className="card table-card">
        <table>
          <thead>
            <tr>
              <th>Request</th>
              <th>People</th>
              <th>Requested</th>
              <th>Status</th>
              <th>Response</th>
            </tr>
          </thead>
          <tbody>
            {[
              ...notes.map((n) => ({
                kind: "notes" as const,
                row: n,
                date: n.requested_at,
                status: n.status,
              })),
              ...stats.map((s) => ({
                kind: "stats" as const,
                row: s,
                date: s.requested_at,
                status: s.status,
              })),
            ].length ? (
              [
                ...notes.map((n) => ({
                  kind: "notes" as const,
                  row: n,
                  date: n.requested_at,
                  status: n.status,
                })),
                ...stats.map((s) => ({
                  kind: "stats" as const,
                  row: s,
                  date: s.requested_at,
                  status: s.status,
                })),
              ].map((item) => (
                <tr key={`${item.kind}-${item.row.id}`}>
                  <td>
                    <b>
                      {item.kind === "notes"
                        ? "Mentor notes"
                        : "Cross-class statistics"}
                    </b>
                  </td>
                  <td>
                    {item.kind === "notes"
                      ? `${students.find((s) => s.id === item.row.student_id)?.name} · ${mentors.find((m) => m.id === item.row.mentor_id)?.name}`
                      : mentors.find((m) => m.id === item.row.mentor_id)?.name}
                  </td>
                  <td>{new Date(item.date).toLocaleDateString()}</td>
                  <td>
                    <span
                      className={`status ${item.status === "approved" || item.status === "accepted" ? "good" : item.status === "denied" ? "bad" : "warn"}`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td>
                    {item.status === "pending" &&
                    ((item.kind === "notes" && !isPrincipal) ||
                      (item.kind === "stats" && isPrincipal)) ? (
                      <div className="row-actions">
                        <button
                          className="tiny-primary"
                          onClick={() =>
                            item.kind === "notes"
                              ? updateNote(item.row, "accepted")
                              : updateStats(item.row, "approved")
                          }
                        >
                          <Check />
                          Approve
                        </button>
                        <button
                          className="icon-btn"
                          onClick={() =>
                            item.kind === "notes"
                              ? updateNote(item.row, "denied")
                              : updateStats(item.row, "denied")
                          }
                        >
                          Deny
                        </button>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5}>
                  <div className="empty-table">
                    <Clock3 />
                    <b>No requests</b>
                    <span>Access requests will appear here.</span>
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
