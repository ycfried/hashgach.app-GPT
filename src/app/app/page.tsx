import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "../page";

export default async function ProtectedApp(){const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");const {data:staff}=await supabase.from("staff").select("name,roles,school_id").eq("id",user.id).maybeSingle();if(!staff)redirect("/login?error=Your+staff+invitation+has+not+been+accepted");const {data:studentRows}=await supabase.from("students").select("id,first_name,last_name,year_level").eq("active",true).order("last_name");const students=(studentRows||[]).map(row=>({id:row.id,name:`${row.first_name} ${row.last_name}`,year:row.year_level||"—",status:"Not marked",grade:0,mentor:"Not assigned"}));return <AppShell profileName={staff.name} roles={staff.roles||[]} schoolId={staff.school_id} initialStudents={students}/>}
