import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell, type SetupBundle, type StudentRow } from "../page";

export default async function ProtectedApp(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect("/login");
  const {data:staff}=await supabase.from("staff").select("name,roles,school_id").eq("id",user.id).maybeSingle();
  if(!staff)redirect("/login?error=Your+staff+invitation+has+not+been+accepted");
  const isPrincipal=(staff.roles||[]).includes("principal");
  const [studentResult,periodResult,classResult,staffResult,offeringResult]=await Promise.all([
    supabase.from("students").select("id,first_name,last_name,year_level").eq("active",true).order("last_name"),
    isPrincipal?supabase.from("periods").select("id,name,start_time,end_time").order("sort_order"):Promise.resolve({data:[]}),
    isPrincipal?supabase.from("classes").select("id,name,subject,grade_level").order("name"):Promise.resolve({data:[]}),
    isPrincipal?supabase.from("staff").select("id,name,roles").order("name"):Promise.resolve({data:[]}),
    isPrincipal?supabase.from("class_offerings").select("id,class_id,period_id,rebbi_id,days_of_week"):Promise.resolve({data:[]}),
  ]);
  const students:StudentRow[]=(studentResult.data||[]).map(row=>({id:row.id,name:`${row.first_name} ${row.last_name}`,year:row.year_level||"—",status:"Not marked",grade:0,mentor:"Not assigned"}));
  const setupData:SetupBundle={periods:periodResult.data||[],classes:classResult.data||[],staff:staffResult.data||[],offerings:offeringResult.data||[]};
  return <AppShell profileName={staff.name} roles={staff.roles||[]} schoolId={staff.school_id} initialStudents={students} setupData={setupData}/>;
}
