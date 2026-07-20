"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  Check,
  FileText,
  Printer,
  Trash2,
  UserRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type ReportsBundle = {
  students: { id: string; name: string; year: string }[];
  zmanim: { id: string; name: string; start_date: string; end_date: string }[];
  sessions: { id: string; session_date: string }[];
  attendance: {
    attendance_session_id: string;
    student_id: string;
    status: string;
    late_minutes: number | null;
  }[];
  tests: {
    id: string;
    name: string;
    test_date: string;
    zman_id: string | null;
    test_type: string;
  }[];
  grades: {
    student_id: string;
    test_id: string;
    raw_score: number;
    applied_bank: number;
    final_score: number;
  }[];
  discipline: {
    student_id: string;
    status: string;
    current_amount: number | null;
  }[];
  conversations: { student_id: string; conversation_date: string }[];
  reportCards: {
    id: string;
    student_id: string;
    zman_id: string | null;
    range_start: string;
    range_end: string;
    generated_at: string;
    status: "draft" | "approved";
    snapshot: StudentSnapshot;
    archived_at?: string | null;
  }[];
};
type StudentSnapshot = {
  studentName: string;
  year: string;
  rangeStart: string;
  rangeEnd: string;
  attendance: {
    present: number;
    late: number;
    absent: number;
    excused: number;
    rate: number;
  };
  average: number | null;
  openActions: number;
  fineTotal: number;
  mentorConversations: number;
  subjects: { name: string; score: number }[];
};

export default function ReportsView({
  schoolId,
  userId,
  isPrincipal,
  initial,
}: {
  schoolId: string;
  userId: string;
  isPrincipal: boolean;
  initial: ReportsBundle;
}) {
  const [studentId, setStudentId] = useState(initial.students[0]?.id || "");
  const [zmanId, setZmanId] = useState(initial.zmanim[0]?.id || "");
  const zman = initial.zmanim.find((z) => z.id === zmanId);
  const [start, setStart] = useState(
    zman?.start_date || new Date().toISOString().slice(0, 10),
  );
  const [end, setEnd] = useState(
    zman?.end_date || new Date().toISOString().slice(0, 10),
  );
  const [cards, setCards] = useState(initial.reportCards);
  const [selectedCard, setSelectedCard] = useState<string>("");
  const [error, setError] = useState("");
  const snapshot = useMemo(
    () => calculate(initial, studentId, start, end),
    [initial, studentId, start, end],
  );
  function chooseZman(id: string) {
    setZmanId(id);
    const z = initial.zmanim.find((x) => x.id === id);
    if (z) {
      setStart(z.start_date);
      setEnd(z.end_date);
    }
  }
  async function generate() {
    if (!snapshot) return;
    const z = initial.zmanim.find((x) => x.id === zmanId);
    const ended = z ? new Date(z.end_date + "T23:59:59") < new Date() : false;
    const { data, error } = await createClient()
      .from("report_cards")
      .insert({
        school_id: schoolId,
        student_id: studentId,
        zman_id: zmanId || null,
        range_start: start,
        range_end: end,
        generated_by: userId,
        status: ended ? "approved" : "draft",
        approved_by: ended ? userId : null,
        approved_at: ended ? new Date().toISOString() : null,
        snapshot,
      })
      .select("*")
      .single();
    if (error) {
      setError(error.message);
      return;
    }
    setCards([data, ...cards]);
    setSelectedCard(data.id);
  }
  async function approve(id: string) {
    const { data, error } = await createClient()
      .from("report_cards")
      .update({
        status: "approved",
        approved_by: userId,
        approved_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) {
      setError(error.message);
      return;
    }
    setCards(cards.map((c) => (c.id === id ? data : c)));
  }
  async function removeCard(card: ReportsBundle["reportCards"][number]) {
    const client = createClient();
    const { error } =
      card.status === "draft"
        ? await client.from("report_cards").delete().eq("id", card.id)
        : await client
            .from("report_cards")
            .update({ archived_at: new Date().toISOString() })
            .eq("id", card.id);
    if (error) {
      setError(error.message);
      return;
    }
    setCards(cards.filter((c) => c.id !== card.id));
    if (selectedCard === card.id) setSelectedCard("");
  }
  const shown = cards.find((c) => c.id === selectedCard)?.snapshot || snapshot;
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">Student hub & reporting</p>
          <h1>Reports & statistics</h1>
          <p>
            Attendance, grades, discipline, and mentoring in one
            student-centered view.
          </p>
        </div>
        {shown && (
          <button className="secondary" onClick={() => window.print()}>
            <Printer />
            Print current view
          </button>
        )}
      </div>
      {error && <p className="form-error setup-error">{error}</p>}
      <section className="card report-filters">
        <label>
          Student
          <select
            value={studentId}
            onChange={(e) => {
              setStudentId(e.target.value);
              setSelectedCard("");
            }}
          >
            {initial.students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.year}
              </option>
            ))}
          </select>
        </label>
        <label>
          Zman
          <select value={zmanId} onChange={(e) => chooseZman(e.target.value)}>
            <option value="">Custom range</option>
            {initial.zmanim.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          From
          <input
            type="date"
            value={start}
            onChange={(e) => {
              setStart(e.target.value);
              setZmanId("");
            }}
          />
        </label>
        <label>
          To
          <input
            type="date"
            value={end}
            onChange={(e) => {
              setEnd(e.target.value);
              setZmanId("");
            }}
          />
        </label>
        {isPrincipal && (
          <button className="primary" disabled={!snapshot} onClick={generate}>
            <FileText />
            Generate report card
          </button>
        )}
      </section>
      {shown ? (
        <StudentHub snapshot={shown} />
      ) : (
        <div className="card empty-state">
          <UserRound />
          <p>Add students and activity to populate statistics.</p>
        </div>
      )}
      {isPrincipal && (
        <section className="card report-history">
          <div className="card-head">
            <h2>Generated report cards</h2>
          </div>
          {cards.length ? (
            cards.map((c) => (
              <div className="report-history-row" key={c.id}>
                <button onClick={() => setSelectedCard(c.id)}>
                  <FileText />
                  <span>
                    <b>
                      {
                        initial.students.find((s) => s.id === c.student_id)
                          ?.name
                      }
                    </b>
                    <small>
                      {new Date(c.range_start + "T00:00").toLocaleDateString()}–
                      {new Date(c.range_end + "T00:00").toLocaleDateString()}
                    </small>
                  </span>
                </button>
                <span
                  className={`status ${c.status === "approved" ? "good" : "warn"}`}
                >
                  {c.status}
                </span>
                {c.status === "draft" && (
                  <button
                    className="tiny-primary"
                    onClick={() => approve(c.id)}
                  >
                    <Check />
                    Approve & publish
                  </button>
                )}
                <button
                  className="icon-btn danger"
                  onClick={() => removeCard(c)}
                  title={
                    c.status === "approved"
                      ? "Archive report card"
                      : "Delete draft"
                  }
                >
                  <Trash2 />
                  {c.status === "approved" ? "Archive" : "Delete"}
                </button>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <FileText />
              <p>No report cards generated yet.</p>
            </div>
          )}
        </section>
      )}
    </>
  );
}

function calculate(
  data: ReportsBundle,
  studentId: string,
  start: string,
  end: string,
): StudentSnapshot | null {
  const student = data.students.find((s) => s.id === studentId);
  if (!student) return null;
  const sessionIds = new Set(
    data.sessions
      .filter((s) => s.session_date >= start && s.session_date <= end)
      .map((s) => s.id),
  );
  const attendance = data.attendance.filter(
    (a) =>
      a.student_id === studentId && sessionIds.has(a.attendance_session_id),
  );
  const counts = { present: 0, late: 0, absent: 0, excused: 0 };
  attendance.forEach((a) => {
    if (a.status in counts) counts[a.status as keyof typeof counts]++;
  });
  const accountable = counts.present + counts.late + counts.absent;
  const rate = accountable
    ? Math.round(((counts.present + counts.late) * 100) / accountable)
    : 0;
  const testIds = new Set(
    data.tests
      .filter((t) => t.test_date >= start && t.test_date <= end)
      .map((t) => t.id),
  );
  const grades = data.grades.filter(
    (g) => g.student_id === studentId && testIds.has(g.test_id),
  );
  const average = grades.length
    ? Math.round(
        grades.reduce((sum, g) => sum + Number(g.final_score), 0) /
          grades.length,
      )
    : null;
  const actions = data.discipline.filter((d) => d.student_id === studentId);
  return {
    studentName: student.name,
    year: student.year,
    rangeStart: start,
    rangeEnd: end,
    attendance: { ...counts, rate },
    average,
    openActions: actions.filter((a) => a.status === "pending").length,
    fineTotal: actions
      .filter((a) => a.status === "pending")
      .reduce((sum, a) => sum + Number(a.current_amount || 0), 0),
    mentorConversations: data.conversations.filter(
      (c) =>
        c.student_id === studentId &&
        c.conversation_date >= start &&
        c.conversation_date <= end,
    ).length,
    subjects: grades.map((g) => ({
      name: data.tests.find((t) => t.id === g.test_id)?.name || "Assessment",
      score: Number(g.final_score),
    })),
  };
}
function StudentHub({ snapshot }: { snapshot: StudentSnapshot }) {
  return (
    <section className="report-card-print">
      <div className="student-hub-head">
        <div>
          <span>Hashgacha student profile</span>
          <h2>{snapshot.studentName}</h2>
          <p>
            {snapshot.year} ·{" "}
            {new Date(snapshot.rangeStart + "T00:00").toLocaleDateString()}–
            {new Date(snapshot.rangeEnd + "T00:00").toLocaleDateString()}
          </p>
        </div>
        <BarChart3 />
      </div>
      <div className="hub-metrics">
        <div>
          <small>Attendance</small>
          <strong>{snapshot.attendance.rate}%</strong>
          <span>
            {snapshot.attendance.present} present · {snapshot.attendance.late}{" "}
            late
          </span>
        </div>
        <div>
          <small>Grade average</small>
          <strong>
            {snapshot.average === null ? "—" : `${snapshot.average}%`}
          </strong>
          <span>{snapshot.subjects.length} recorded assessments</span>
        </div>
        <div>
          <small>Open actions</small>
          <strong>{snapshot.openActions}</strong>
          <span>${snapshot.fineTotal.toFixed(2)} pending fines</span>
        </div>
        <div>
          <small>Mentor contacts</small>
          <strong>{snapshot.mentorConversations}</strong>
          <span>in selected range</span>
        </div>
      </div>
      <div className="hub-grid">
        <article className="card">
          <div className="card-head">
            <h2>Attendance detail</h2>
          </div>
          {Object.entries(snapshot.attendance)
            .filter(([k]) => k !== "rate")
            .map(([k, v]) => (
              <div className="hub-row" key={k}>
                <span>{k}</span>
                <b>{v}</b>
              </div>
            ))}
        </article>
        <article className="card">
          <div className="card-head">
            <h2>Assessment results</h2>
          </div>
          {snapshot.subjects.length ? (
            snapshot.subjects.map((s, i) => (
              <div className="hub-row" key={`${s.name}-${i}`}>
                <span>{s.name}</span>
                <b>{s.score}%</b>
              </div>
            ))
          ) : (
            <div className="empty-state small-empty">
              <p>No grades in this range.</p>
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
