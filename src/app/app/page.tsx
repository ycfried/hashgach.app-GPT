import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell, type SetupBundle, type StudentRow } from "../page";
import type { AttendanceBundle } from "@/components/attendance-view";
import type { DisciplineBundle } from "@/components/discipline-view";

export default async function ProtectedApp(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect("/login");
  const {data:staff}=await supabase.from("staff").select("name,roles,school_id").eq("id",user.id).maybeSingle();
  if(!staff)redirect("/login?error=Your+staff+invitation+has+not+been+accepted");
  const isPrincipal=(staff.roles||[]).includes("principal");
  const today=new Date().toISOString().slice(0,10);const weekday=new Date().getDay();
  const [studentResult,periodResult,classResult,staffResult,offeringResult,assignmentResult,sessionResult,typeResult,disciplineResult,schoolResult]=await Promise.all([
    supabase.from("students").select("id,first_name,last_name,year_level").eq("active",true).order("last_name"),
    supabase.from("periods").select("id,name,start_time,end_time").order("sort_order"),
    supabase.from("classes").select("id,name,subject,grade_level").order("name"),
    isPrincipal?supabase.from("staff").select("id,name,roles").order("name"):Promise.resolve({data:[]}),
    supabase.from("class_offerings").select("id,class_id,period_id,rebbi_id,days_of_week,default_start_time,default_end_time"),
    supabase.from("student_period_assignments").select("id,student_id,period_id,class_offering_id"),
    supabase.from("attendance_sessions").select("id,class_offering_id,status,actual_start_time").eq("session_date",today),
    supabase.from("punishment_types").select("id,name,description,category,points_value,is_fine,base_amount,late_threshold_min,late_threshold_max,active").order("name"),
    supabase.from("punishment_records").select("id,student_id,punishment_type_id,assigned_at,created_via,status,due_at,snoozed_until,snooze_count,base_amount,current_amount,escalation_active,last_escalated_at,exacted_by,exacted_at,exaction_notes").order("assigned_at",{ascending:false}),
    supabase.from("schools").select("settings").eq("id",staff.school_id).maybeSingle(),
  ]);
  const sessionIds=(sessionResult.data||[]).map(s=>s.id);
  const recordResult=sessionIds.length?await supabase.from("attendance_records").select("id,attendance_session_id,student_id,status,late_minutes").in("attendance_session_id",sessionIds):{data:[]};
  const students:StudentRow[]=(studentResult.data||[]).map(row=>({id:row.id,name:`${row.first_name} ${row.last_name}`,year:row.year_level||"—",status:"Not marked",grade:0,mentor:"Not assigned"}));
  const setupData:SetupBundle={periods:periodResult.data||[],classes:classResult.data||[],staff:staffResult.data||[],offerings:(offeringResult.data||[]).map(row=>({id:row.id,class_id:row.class_id,period_id:row.period_id,rebbi_id:row.rebbi_id,days_of_week:row.days_of_week})),students:students.filter(s=>s.id).map(s=>({id:s.id!,name:s.name,year:s.year})),assignments:assignmentResult.data||[]};
  const todayOfferings=(offeringResult.data||[]).filter(o=>(o.days_of_week||[]).includes(weekday));
  const attendanceData:AttendanceBundle={
    students:students.filter(s=>s.id).map(s=>({id:s.id!,name:s.name})),
    offerings:todayOfferings.map(o=>{const c=(classResult.data||[]).find(x=>x.id===o.class_id);const p=(periodResult.data||[]).find(x=>x.id===o.period_id);return{id:o.id,className:c?.name||"Class",subject:c?.subject||"",periodName:p?.name||"Unscheduled",startTime:o.default_start_time||p?.start_time||"09:00",endTime:o.default_end_time||p?.end_time||"10:00",studentIds:(assignmentResult.data||[]).filter(a=>a.class_offering_id===o.id).map(a=>a.student_id)}}),
    sessions:(sessionResult.data||[]).map(s=>({id:s.id,offeringId:s.class_offering_id,status:s.status as "active"|"completed",startTime:s.actual_start_time,records:(recordResult.data||[]).filter(r=>r.attendance_session_id===s.id).map(r=>({id:r.id,studentId:r.student_id,status:r.status,lateMinutes:r.late_minutes}))})),
  };
  const settings=(schoolResult.data?.settings||{}) as {snooze_days?:number;snooze_cap?:number};
  const disciplineData:DisciplineBundle={types:(typeResult.data||[]) as DisciplineBundle["types"],records:(disciplineResult.data||[]) as DisciplineBundle["records"],students:students.filter(s=>s.id).map(s=>({id:s.id!,name:s.name})),snoozeDays:settings.snooze_days||1,snoozeCap:settings.snooze_cap||3};
  return <AppShell profileName={staff.name} roles={staff.roles||[]} schoolId={staff.school_id} userId={user.id} initialStudents={students} setupData={setupData} attendanceData={attendanceData} disciplineData={disciplineData}/>;
}
