"use client";

import { useState } from "react";
import {
  Banknote,
  BookOpenCheck,
  CalendarRange,
  Check,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type ZmanData = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
};
export type GradeOffering = {
  id: string;
  name: string;
  subject: string;
  studentIds: string[];
};
export type TestData = {
  id: string;
  class_offering_id: string;
  zman_id: string | null;
  name: string;
  test_type: "quiz" | "test" | "final";
  test_date: string;
  max_score: number;
};
export type GradeData = {
  id: string;
  test_id: string;
  student_id: string;
  raw_score: number;
  applied_bank: number;
  final_score: number;
};
export type BankData = {
  student_id: string;
  subject: string;
  zman_id: string;
  balance: number;
};
export type TransferData = {
  student_id: string;
  source_test_id: string;
  target_test_id: string;
  amount: number;
  subject: string;
  zman_id: string;
};
export type GradesBundle = {
  zmanim: ZmanData[];
  offerings: GradeOffering[];
  tests: TestData[];
  grades: GradeData[];
  banks: BankData[];
  transfers: TransferData[];
  students: { id: string; name: string }[];
};

export default function GradesView({
  schoolId,
  userId,
  isPrincipal,
  initial,
}: {
  schoolId: string;
  userId: string;
  isPrincipal: boolean;
  initial: GradesBundle;
}) {
  const [tab, setTab] = useState<"gradebook" | "tests" | "zmanim" | "bank">(
    "gradebook",
  );
  const [zmanim, setZmanim] = useState(initial.zmanim);
  const [tests, setTests] = useState(initial.tests);
  const [grades, setGrades] = useState(initial.grades);
  const [error, setError] = useState("");
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">Academics</p>
          <h1>Grades & testing</h1>
          <p>
            Assessments, weighted reporting periods, and automatic surplus
            points.
          </p>
        </div>
      </div>
      <div className="setup-tabs">
        <button
          className={tab === "gradebook" ? "active" : ""}
          onClick={() => setTab("gradebook")}
        >
          <BookOpenCheck />
          Gradebook <span>{grades.length}</span>
        </button>
        <button
          className={tab === "tests" ? "active" : ""}
          onClick={() => setTab("tests")}
        >
          <BookOpenCheck />
          Tests <span>{tests.length}</span>
        </button>
        {isPrincipal && (
          <button
            className={tab === "zmanim" ? "active" : ""}
            onClick={() => setTab("zmanim")}
          >
            <CalendarRange />
            Zmanim <span>{zmanim.length}</span>
          </button>
        )}
        <button
          className={tab === "bank" ? "active" : ""}
          onClick={() => setTab("bank")}
        >
          <Banknote />
          Point bank{" "}
          <span>
            {initial.banks.filter((b) => Number(b.balance) > 0).length}
          </span>
        </button>
      </div>
      {error && <p className="form-error setup-error">{error}</p>}
      {tab === "zmanim" ? (
        <Zmanim
          schoolId={schoolId}
          rows={zmanim}
          setRows={setZmanim}
          onError={setError}
        />
      ) : tab === "tests" ? (
        <Tests
          schoolId={schoolId}
          rows={tests}
          setRows={setTests}
          zmanim={zmanim}
          offerings={initial.offerings}
          onError={setError}
        />
      ) : tab === "bank" ? (
        <Bank initial={initial} tests={tests} />
      ) : (
        <Gradebook
          schoolId={schoolId}
          userId={userId}
          initial={initial}
          tests={tests}
          grades={grades}
          setGrades={setGrades}
          onError={setError}
        />
      )}
    </>
  );
}

function Zmanim({
  schoolId,
  rows,
  setRows,
  onError,
}: {
  schoolId: string;
  rows: ZmanData[];
  setRows: (v: ZmanData[]) => void;
  onError: (v: string) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [start, setStart] = useState(new Date().toISOString().slice(0, 10));
  const [end, setEnd] = useState("");
  function begin(row: ZmanData) {
    setEditing(row.id);
    setName(row.name);
    setStart(row.start_date);
    setEnd(row.end_date);
  }
  function reset() {
    setEditing(null);
    setName("");
    setEnd("");
  }
  async function save() {
    const client = createClient();
    const values = { name: name.trim(), start_date: start, end_date: end };
    const query = editing
      ? client.from("zmanim").update(values).eq("id", editing)
      : client.from("zmanim").insert({ school_id: schoolId, ...values });
    const { data, error } = await query
      .select("id,name,start_date,end_date")
      .single();
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
  async function remove(id: string) {
    const { error } = await createClient().from("zmanim").delete().eq("id", id);
    if (error) {
      onError(error.message);
      return;
    }
    setRows(rows.filter((r) => r.id !== id));
    if (editing === id) reset();
  }
  return (
    <div className="setup-grid">
      <section className="card setup-form">
        <span className="setup-icon">
          <CalendarRange />
        </span>
        <h2>{editing ? "Edit zman" : "Create a zman"}</h2>
        <p>
          Point banks and report-card calculations remain isolated inside this
          date range.
        </p>
        <label>
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Elul Zman"
          />
        </label>
        <div className="field-pair">
          <label>
            Starts
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <label>
            Ends
            <input
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>
        </div>
        <div className="setup-form-actions">
          {editing && (
            <button className="secondary" onClick={reset}>
              <X />
              Cancel
            </button>
          )}
          <button
            className="primary"
            disabled={!name.trim() || !start || !end}
            onClick={save}
          >
            {editing ? <Pencil /> : <Plus />}
            {editing ? "Save zman" : "Create zman"}
          </button>
        </div>
      </section>
      <SimpleList
        title="Grading periods"
        empty="No zmanim yet"
        rows={rows.map((r) => ({
          id: r.id,
          title: r.name,
          detail: `${new Date(r.start_date + "T00:00").toLocaleDateString()}–${new Date(r.end_date + "T00:00").toLocaleDateString()}`,
        }))}
        onEdit={(id) => begin(rows.find((r) => r.id === id)!)}
        onDelete={remove}
      />
    </div>
  );
}

function Tests({
  schoolId,
  rows,
  setRows,
  zmanim,
  offerings,
  onError,
}: {
  schoolId: string;
  rows: TestData[];
  setRows: (v: TestData[]) => void;
  zmanim: ZmanData[];
  offerings: GradeOffering[];
  onError: (v: string) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [offering, setOffering] = useState(offerings[0]?.id || "");
  const [zman, setZman] = useState(zmanim[0]?.id || "");
  const [kind, setKind] = useState<"quiz" | "test" | "final">("test");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  function begin(row: TestData) {
    setEditing(row.id);
    setName(row.name);
    setOffering(row.class_offering_id);
    setZman(row.zman_id || "");
    setKind(row.test_type);
    setDate(row.test_date);
  }
  function reset() {
    setEditing(null);
    setName("");
    setOffering(offerings[0]?.id || "");
    setZman(zmanim[0]?.id || "");
    setKind("test");
  }
  async function save() {
    const client = createClient();
    const values = {
      class_offering_id: offering,
      zman_id: zman,
      name,
      test_type: kind,
      test_date: date,
      max_score: 100,
    };
    const query = editing
      ? client.from("tests").update(values).eq("id", editing)
      : client.from("tests").insert({ school_id: schoolId, ...values });
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
  async function remove(id: string) {
    const { error } = await createClient().from("tests").delete().eq("id", id);
    if (error) {
      onError(error.message);
      return;
    }
    setRows(rows.filter((r) => r.id !== id));
    if (editing === id) reset();
  }
  const ready = offerings.length && zmanim.length;
  return (
    <div className="setup-grid">
      <section className="card setup-form">
        <span className="setup-icon">
          <BookOpenCheck />
        </span>
        <h2>{editing ? "Edit assessment" : "Create an assessment"}</h2>
        <p>
          Quiz, test, and final weights come from the school’s reporting policy.
        </p>
        {!ready && (
          <div className="setup-hint">
            Create a zman and class offering first.
          </div>
        )}
        <label>
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Gemara Chapter 1"
          />
        </label>
        <label>
          Class
          <select
            value={offering}
            onChange={(e) => setOffering(e.target.value)}
          >
            {offerings.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name} · {o.subject}
              </option>
            ))}
          </select>
        </label>
        <div className="field-pair">
          <label>
            Type
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as typeof kind)}
            >
              <option value="quiz">Quiz · 0.5×</option>
              <option value="test">Test · 1×</option>
              <option value="final">Final · 4×</option>
            </select>
          </label>
          <label>
            Date
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
        </div>
        <label>
          Zman
          <select value={zman} onChange={(e) => setZman(e.target.value)}>
            {zmanim.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>
        </label>
        <div className="setup-form-actions">
          {editing && (
            <button className="secondary" onClick={reset}>
              <X />
              Cancel
            </button>
          )}
          <button
            className="primary"
            disabled={!ready || !name.trim()}
            onClick={save}
          >
            {editing ? <Pencil /> : <Plus />}
            {editing ? "Save assessment" : "Create assessment"}
          </button>
        </div>
      </section>
      <SimpleList
        title="Assessments"
        empty="No assessments yet"
        rows={rows.map((r) => ({
          id: r.id,
          title: r.name,
          detail: `${r.test_type} · ${new Date(r.test_date + "T00:00").toLocaleDateString()} · ${offerings.find((o) => o.id === r.class_offering_id)?.name || "Class"}`,
        }))}
        onEdit={(id) => begin(rows.find((r) => r.id === id)!)}
        onDelete={remove}
      />
    </div>
  );
}

function Gradebook({
  schoolId,
  userId,
  initial,
  tests,
  grades,
  setGrades,
  onError,
}: {
  schoolId: string;
  userId: string;
  initial: GradesBundle;
  tests: TestData[];
  grades: GradeData[];
  setGrades: (v: GradeData[]) => void;
  onError: (v: string) => void;
}) {
  const [testId, setTestId] = useState(tests[0]?.id || "");
  const test = tests.find((t) => t.id === testId);
  const offering = initial.offerings.find(
    (o) => o.id === test?.class_offering_id,
  );
  const roster = initial.students.filter((s) =>
    offering?.studentIds.includes(s.id),
  );
  async function save(studentId: string, value: string) {
    if (!test) return;
    const existing = grades.find(
      (g) => g.test_id === test.id && g.student_id === studentId,
    );
    if (!value.trim() && existing) {
      const { error } = await createClient()
        .from("grades")
        .delete()
        .eq("id", existing.id);
      if (error) {
        onError(error.message);
        return;
      }
      setGrades(grades.filter((g) => g.id !== existing.id));
      return;
    }
    const score = Number(value);
    if (!Number.isFinite(score) || score < 0) return;
    const { data, error } = await createClient()
      .from("grades")
      .upsert(
        {
          school_id: schoolId,
          test_id: test.id,
          student_id: studentId,
          raw_score: score,
          entered_by: userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "test_id,student_id" },
      )
      .select("id,test_id,student_id,raw_score,applied_bank,final_score")
      .single();
    if (error) {
      onError(error.message);
      return;
    }
    const refreshed = await createClient()
      .from("grades")
      .select("id,test_id,student_id,raw_score,applied_bank,final_score");
    setGrades(
      refreshed.data || [...grades.filter((g) => g.id !== data.id), data],
    );
  }
  return (
    <>
      <div className="card gradebook-picker">
        <label>
          Assessment
          <select value={testId} onChange={(e) => setTestId(e.target.value)}>
            {tests.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ·{" "}
                {new Date(t.test_date + "T00:00").toLocaleDateString()}
              </option>
            ))}
          </select>
        </label>
        {test && (
          <div>
            <b>{offering?.name}</b>
            <small>
              {offering?.subject} · {test.test_type}
            </small>
          </div>
        )}
      </div>
      <div className="card table-card">
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Raw score</th>
              <th>Bank applied</th>
              <th>Final score</th>
            </tr>
          </thead>
          <tbody>
            {test && roster.length ? (
              roster.map((student) => {
                const grade = grades.find(
                  (g) => g.test_id === test.id && g.student_id === student.id,
                );
                return (
                  <tr key={student.id}>
                    <td>
                      <b>{student.name}</b>
                    </td>
                    <td>
                      <input
                        className="score-input"
                        type="number"
                        min="0"
                        defaultValue={grade?.raw_score ?? ""}
                        onBlur={(e) => save(student.id, e.target.value)}
                        placeholder="—"
                      />
                    </td>
                    <td>
                      {Number(grade?.applied_bank || 0) > 0 ? (
                        <span className="status good">
                          +{grade?.applied_bank} applied
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <b>{grade?.final_score ?? "—"}</b>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={4}>
                  <div className="empty-table">
                    <BookOpenCheck />
                    <b>
                      {tests.length
                        ? "No students assigned"
                        : "No assessments yet"}
                    </b>
                    <span>
                      {tests.length
                        ? "Assign students to this class offering first."
                        : "Create a zman and assessment to begin grading."}
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

function Bank({
  initial,
  tests,
}: {
  initial: GradesBundle;
  tests: TestData[];
}) {
  return (
    <div className="card table-card">
      <table>
        <thead>
          <tr>
            <th>Student</th>
            <th>Subject</th>
            <th>Zman</th>
            <th>Available</th>
            <th>Transfer history</th>
          </tr>
        </thead>
        <tbody>
          {initial.banks.length ? (
            initial.banks.map((bank) => (
              <tr key={`${bank.student_id}-${bank.subject}-${bank.zman_id}`}>
                <td>
                  <b>
                    {initial.students.find((s) => s.id === bank.student_id)
                      ?.name || "Student"}
                  </b>
                </td>
                <td>{bank.subject}</td>
                <td>
                  {initial.zmanim.find((z) => z.id === bank.zman_id)?.name ||
                    "Zman"}
                </td>
                <td>
                  <span className="status good">{bank.balance} pts</span>
                </td>
                <td>
                  {initial.transfers
                    .filter(
                      (t) =>
                        t.student_id === bank.student_id &&
                        t.subject === bank.subject &&
                        t.zman_id === bank.zman_id,
                    )
                    .map((t, i) => (
                      <small className="transfer-line" key={i}>
                        +{t.amount}:{" "}
                        {tests.find((x) => x.id === t.source_test_id)?.name} →{" "}
                        {tests.find((x) => x.id === t.target_test_id)?.name}
                      </small>
                    ))}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5}>
                <div className="empty-table">
                  <Banknote />
                  <b>No bank activity</b>
                  <span>
                    Scores above 100 will appear here and apply automatically.
                  </span>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
function SimpleList({
  title,
  empty,
  rows,
  onEdit,
  onDelete,
}: {
  title: string;
  empty: string;
  rows: { id: string; title: string; detail: string }[];
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => Promise<void>;
}) {
  const [confirming, setConfirming] = useState<string | null>(null);
  return (
    <section className="card setup-list">
      <div className="card-head">
        <h2>{title}</h2>
      </div>
      {rows.length ? (
        rows.map((r) => (
          <div className="setup-row" key={r.id}>
            <span>
              <BookOpenCheck />
            </span>
            <div>
              <b>{r.title}</b>
              <small>{r.detail}</small>
            </div>
            {onEdit && (
              <button
                className="icon-action"
                onClick={() => onEdit(r.id)}
                aria-label={`Edit ${r.title}`}
              >
                <Pencil />
              </button>
            )}
            {onDelete &&
              (confirming === r.id ? (
                <span className="row-confirm">
                  <small>Remove?</small>
                  <button onClick={() => setConfirming(null)}>No</button>
                  <button
                    className="danger"
                    onClick={async () => {
                      await onDelete(r.id);
                      setConfirming(null);
                    }}
                  >
                    <Check />
                    Yes
                  </button>
                </span>
              ) : (
                <button
                  className="icon-action danger"
                  onClick={() => setConfirming(r.id)}
                  aria-label={`Remove ${r.title}`}
                >
                  <Trash2 />
                </button>
              ))}
          </div>
        ))
      ) : (
        <div className="empty-state">
          <BookOpenCheck />
          <p>{empty}.</p>
        </div>
      )}
    </section>
  );
}
