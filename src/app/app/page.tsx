import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell, type SetupBundle, type StudentRow } from "../page";
import type { AttendanceBundle } from "@/components/attendance-view";
import type { DisciplineBundle } from "@/components/discipline-view";
import type { GradesBundle } from "@/components/grades-view";
import type { ScheduleBundle } from "@/components/schedule-view";
import type { MentoringBundle } from "@/components/mentoring-view";
import type { ReportsBundle } from "@/components/reports-view";
import type { ChatBundle } from "@/components/chat-view";
import type { AdminBundle } from "@/components/admin-view";

export default async function ProtectedApp() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: staff } = await supabase
    .from("staff")
    .select("name,roles,school_id")
    .eq("id", user.id)
    .eq("active", true)
    .maybeSingle();
  if (!staff)
    redirect("/login?error=Your+staff+invitation+has+not+been+accepted");
  const today = new Date().toISOString().slice(0, 10);
  const weekday = new Date().getDay();
  const [
    studentResult,
    periodResult,
    classResult,
    staffResult,
    offeringResult,
    assignmentResult,
    sessionResult,
    typeResult,
    disciplineResult,
    schoolResult,
    zmanResult,
    testResult,
    gradeResult,
    bankResult,
    transferResult,
    scheduleTemplateResult,
    scheduleBlockResult,
    scheduleInstanceResult,
    mentorAssignmentResult,
    conversationResult,
    noteRequestResult,
    statsRequestResult,
    statsSessionResult,
    statsAttendanceResult,
    reportCardResult,
    chatResult,
    auditResult,
  ] = await Promise.all([
    supabase
      .from("students")
      .select("id,first_name,last_name,year_level")
      .eq("active", true)
      .order("last_name"),
    supabase
      .from("periods")
      .select("id,name,start_time,end_time")
      .order("sort_order"),
    supabase
      .from("classes")
      .select("id,name,subject,grade_level")
      .order("name"),
    supabase
      .from("staff")
      .select("id,name,roles")
      .eq("active", true)
      .order("name"),
    supabase
      .from("class_offerings")
      .select(
        "id,class_id,period_id,rebbi_id,days_of_week,default_start_time,default_end_time",
      ),
    supabase
      .from("student_period_assignments")
      .select("id,student_id,period_id,class_offering_id"),
    supabase
      .from("attendance_sessions")
      .select("id,class_offering_id,status,actual_start_time")
      .eq("session_date", today),
    supabase
      .from("punishment_types")
      .select(
        "id,name,description,category,points_value,is_fine,base_amount,late_threshold_min,late_threshold_max,active",
      )
      .order("name"),
    supabase
      .from("punishment_records")
      .select(
        "id,student_id,punishment_type_id,assigned_by,assigned_at,created_via,status,due_at,snoozed_until,snooze_count,base_amount,current_amount,escalation_active,last_escalated_at,exacted_by,exacted_at,exaction_notes",
      )
      .order("assigned_at", { ascending: false }),
    supabase
      .from("schools")
      .select("name,settings")
      .eq("id", staff.school_id)
      .maybeSingle(),
    supabase
      .from("zmanim")
      .select("id,name,start_date,end_date")
      .order("start_date", { ascending: false }),
    supabase
      .from("tests")
      .select("id,class_offering_id,zman_id,name,test_type,test_date,max_score")
      .order("test_date", { ascending: false }),
    supabase
      .from("grades")
      .select("id,test_id,student_id,raw_score,applied_bank,final_score"),
    supabase.from("point_bank").select("student_id,subject,zman_id,balance"),
    supabase
      .from("point_bank_transfers")
      .select(
        "student_id,source_test_id,target_test_id,amount,subject,zman_id",
      ),
    supabase
      .from("schedule_templates")
      .select("id,name,default_anchor_time,active")
      .eq("active", true)
      .order("created_at"),
    supabase
      .from("schedule_blocks")
      .select("id,template_id,name,position,duration_minutes,gap_after_minutes")
      .order("position"),
    supabase
      .from("schedule_instances")
      .select("id,template_id,date,anchor_start_time,calculated_blocks")
      .order("date", { ascending: false })
      .limit(30),
    supabase
      .from("mentor_assignments")
      .select("id,mentor_id,student_id,source,contact_interval_days,flagged"),
    supabase
      .from("mentor_conversations")
      .select(
        "id,mentor_id,student_id,conversation_date,status,notes,shared_with_principal,created_at",
      )
      .order("conversation_date", { ascending: false }),
    supabase
      .from("note_requests")
      .select(
        "id,principal_id,mentor_id,student_id,requested_at,requested_duration_days,status,expires_at,ended_early_at",
      )
      .order("requested_at", { ascending: false }),
    supabase
      .from("stats_access_requests")
      .select("id,mentor_id,requested_at,status,expires_at,revoked_at")
      .order("requested_at", { ascending: false }),
    supabase.from("attendance_sessions").select("id,session_date"),
    supabase
      .from("attendance_records")
      .select("attendance_session_id,student_id,status,late_minutes"),
    supabase
      .from("report_cards")
      .select(
        "id,student_id,zman_id,range_start,range_end,generated_at,status,snapshot,archived_at",
      )
      .is("archived_at", null)
      .order("generated_at", { ascending: false }),
    supabase
      .from("chat_messages")
      .select("id,sender_id,channel_type,channel_id,body,created_at")
      .order("created_at")
      .limit(500),
    supabase
      .from("audit_log")
      .select(
        "id,actor_id,action,entity_type,entity_id,before_value,after_value,occurred_at",
      )
      .order("occurred_at", { ascending: false })
      .limit(500),
  ]);
  const sessionIds = (sessionResult.data || []).map((s) => s.id);
  const recordResult = sessionIds.length
    ? await supabase
        .from("attendance_records")
        .select("id,attendance_session_id,student_id,status,late_minutes")
        .in("attendance_session_id", sessionIds)
    : { data: [] };
  const students: StudentRow[] = (studentResult.data || []).map((row) => ({
    id: row.id,
    name: `${row.first_name} ${row.last_name}`,
    year: row.year_level || "—",
    status: "Not marked",
    grade: 0,
    mentor: "Not assigned",
  }));
  const setupData: SetupBundle = {
    periods: periodResult.data || [],
    classes: classResult.data || [],
    staff: staffResult.data || [],
    offerings: (offeringResult.data || []).map((row) => ({
      id: row.id,
      class_id: row.class_id,
      period_id: row.period_id,
      rebbi_id: row.rebbi_id,
      days_of_week: row.days_of_week,
    })),
    students: students
      .filter((s) => s.id)
      .map((s) => ({ id: s.id!, name: s.name, year: s.year })),
    assignments: assignmentResult.data || [],
  };
  const todayOfferings = (offeringResult.data || []).filter((o) =>
    (o.days_of_week || []).includes(weekday),
  );
  const attendanceData: AttendanceBundle = {
    students: students
      .filter((s) => s.id)
      .map((s) => ({ id: s.id!, name: s.name })),
    offerings: todayOfferings.map((o) => {
      const c = (classResult.data || []).find((x) => x.id === o.class_id);
      const p = (periodResult.data || []).find((x) => x.id === o.period_id);
      return {
        id: o.id,
        className: c?.name || "Class",
        subject: c?.subject || "",
        periodName: p?.name || "Unscheduled",
        startTime: o.default_start_time || p?.start_time || "09:00",
        endTime: o.default_end_time || p?.end_time || "10:00",
        studentIds: (assignmentResult.data || [])
          .filter((a) => a.class_offering_id === o.id)
          .map((a) => a.student_id),
      };
    }),
    sessions: (sessionResult.data || []).map((s) => ({
      id: s.id,
      offeringId: s.class_offering_id,
      status: s.status as "active" | "completed",
      startTime: s.actual_start_time,
      records: (recordResult.data || [])
        .filter((r) => r.attendance_session_id === s.id)
        .map((r) => ({
          id: r.id,
          studentId: r.student_id,
          status: r.status,
          lateMinutes: r.late_minutes,
        })),
    })),
  };
  const settings = (schoolResult.data?.settings || {}) as {
    snooze_days?: number;
    snooze_cap?: number;
  };
  const disciplineData: DisciplineBundle = {
    types: (typeResult.data || []) as DisciplineBundle["types"],
    records: (disciplineResult.data || []) as DisciplineBundle["records"],
    students: students
      .filter((s) => s.id)
      .map((s) => ({ id: s.id!, name: s.name })),
    snoozeDays: settings.snooze_days || 1,
    snoozeCap: settings.snooze_cap || 3,
  };
  const gradesData: GradesBundle = {
    zmanim: zmanResult.data || [],
    offerings: (offeringResult.data || []).map((o) => {
      const c = (classResult.data || []).find((x) => x.id === o.class_id);
      return {
        id: o.id,
        name: c?.name || "Class",
        subject: c?.subject || "",
        studentIds: (assignmentResult.data || [])
          .filter((a) => a.class_offering_id === o.id)
          .map((a) => a.student_id),
      };
    }),
    tests: (testResult.data || []) as GradesBundle["tests"],
    grades: gradeResult.data || [],
    banks: bankResult.data || [],
    transfers: transferResult.data || [],
    students: students
      .filter((s) => s.id)
      .map((s) => ({ id: s.id!, name: s.name })),
  };
  const scheduleData: ScheduleBundle = {
    templates: scheduleTemplateResult.data || [],
    blocks: scheduleBlockResult.data || [],
    instances: (scheduleInstanceResult.data ||
      []) as ScheduleBundle["instances"],
  };
  const mentoringData: MentoringBundle = {
    assignments: (mentorAssignmentResult.data ||
      []) as MentoringBundle["assignments"],
    conversations: (conversationResult.data ||
      []) as MentoringBundle["conversations"],
    noteRequests: (noteRequestResult.data ||
      []) as MentoringBundle["noteRequests"],
    statsRequests: (statsRequestResult.data ||
      []) as MentoringBundle["statsRequests"],
    students: students
      .filter((s) => s.id)
      .map((s) => ({ id: s.id!, name: s.name, year: s.year })),
    mentors: (staffResult.data || [])
      .filter((s) => (s.roles || []).includes("mashpia"))
      .map((s) => ({ id: s.id, name: s.name })),
  };
  const reportsData: ReportsBundle = {
    students: students
      .filter((s) => s.id)
      .map((s) => ({ id: s.id!, name: s.name, year: s.year })),
    zmanim: zmanResult.data || [],
    sessions: statsSessionResult.data || [],
    attendance: statsAttendanceResult.data || [],
    tests: (testResult.data || []).map((t) => ({
      id: t.id,
      name: t.name,
      test_date: t.test_date,
      zman_id: t.zman_id,
      test_type: t.test_type,
    })),
    grades: (gradeResult.data || []).map((g) => ({
      student_id: g.student_id,
      test_id: g.test_id,
      raw_score: g.raw_score,
      applied_bank: g.applied_bank,
      final_score: g.final_score,
    })),
    discipline: (disciplineResult.data || []).map((d) => ({
      student_id: d.student_id,
      status: d.status,
      current_amount: d.current_amount,
    })),
    conversations: (conversationResult.data || []).map((c) => ({
      student_id: c.student_id,
      conversation_date: c.conversation_date,
    })),
    reportCards: (reportCardResult.data || []) as ReportsBundle["reportCards"],
  };
  const chatData: ChatBundle = {
    staff: (staffResult.data || []).map((s) => ({ id: s.id, name: s.name })),
    messages: (chatResult.data || []) as ChatBundle["messages"],
  };
  const adminData: AdminBundle = {
    schoolName: schoolResult.data?.name || "",
    settings: (schoolResult.data?.settings || {}) as Record<string, unknown>,
    staff: (staffResult.data || []).map((s) => ({ id: s.id, name: s.name })),
    audit: (auditResult.data || []) as AdminBundle["audit"],
    students: (studentResult.data || []) as Record<string, unknown>[],
    grades: (gradeResult.data || []) as Record<string, unknown>[],
    attendance: (statsAttendanceResult.data || []) as Record<string, unknown>[],
    discipline: (disciplineResult.data || []) as Record<string, unknown>[],
  };
  return (
    <AppShell
      profileName={staff.name}
      roles={staff.roles || []}
      schoolId={staff.school_id}
      userId={user.id}
      initialStudents={students}
      setupData={setupData}
      attendanceData={attendanceData}
      disciplineData={disciplineData}
      gradesData={gradesData}
      scheduleData={scheduleData}
      mentoringData={mentoringData}
      reportsData={reportsData}
      chatData={chatData}
      adminData={adminData}
    />
  );
}
