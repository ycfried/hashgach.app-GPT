"use client";

import { useState } from "react";
import {
  Bell, BookOpen, CalendarDays, ChevronDown, ChevronRight, ClipboardCheck,
  Clock3, FileBarChart, GraduationCap, Home, Languages, Menu, MessageCircle,
  Copy, LogOut, MoreHorizontal, Plus, Search, Settings, ShieldCheck, Sparkles, UserPlus, Users, X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import SetupView, { type AssignmentData, type ClassData, type OfferingData, type PeriodData, type SetupStudentData, type StaffData } from "@/components/setup-view";
import AttendanceView, { type AttendanceBundle } from "@/components/attendance-view";
import DisciplineView, { type DisciplineBundle } from "@/components/discipline-view";
import GradesView, { type GradesBundle } from "@/components/grades-view";
import ScheduleView, { type ScheduleBundle } from "@/components/schedule-view";
import MentoringView, { type MentoringBundle } from "@/components/mentoring-view";
import ReportsView, { type ReportsBundle } from "@/components/reports-view";
import ChatView, { type ChatBundle } from "@/components/chat-view";
import AdminView, { type AdminBundle } from "@/components/admin-view";

type View = "Dashboard" | "Students" | "Attendance" | "Discipline" | "Grades" | "Schedule" | "Mentoring" | "Reports" | "Messages" | "Staff" | "Setup" | "Admin";

const nav: { label: View; icon: typeof Home }[] = [
  { label: "Dashboard", icon: Home }, { label: "Students", icon: Users },
  { label: "Attendance", icon: ClipboardCheck }, { label: "Discipline", icon: ShieldCheck },
  { label: "Grades", icon: GraduationCap }, { label: "Schedule", icon: CalendarDays },
  { label: "Mentoring", icon: MessageCircle }, { label: "Reports", icon: FileBarChart },
  { label: "Messages", icon: MessageCircle },
  { label: "Staff", icon: UserPlus },
  { label: "Setup", icon: Settings },
];

export type StudentRow={id?:string;name:string;year:string;status:string;grade:number;mentor:string};
const students:StudentRow[] = [
  { name: "Ari Stein", year: "Shiur Alef", status: "Present", grade: 93, mentor: "Rabbi Cohen" },
  { name: "Dovid Katz", year: "Shiur Alef", status: "Late · 12m", grade: 88, mentor: "Rabbi Cohen" },
  { name: "Moshe Levi", year: "Shiur Beis", status: "Excused", grade: 91, mentor: "Rabbi Weiss" },
  { name: "Yossi Friedman", year: "Shiur Beis", status: "Absent", grade: 84, mentor: "Rabbi Weiss" },
  { name: "Shmuel Green", year: "Shiur Gimmel", status: "Present", grade: 96, mentor: "Rabbi Adler" },
];

function Logo() {
  return <div className="brand"><span className="brand-mark"><BookOpen size={22}/></span><span>Hashgacha</span></div>;
}

function Status({ children }: { children: React.ReactNode }) {
  const text = String(children).toLowerCase();
  const kind = text.includes("present") || text.includes("progress") || text.includes("exacted") ? "good" : text.includes("absent") || text.includes("overdue") ? "bad" : text.includes("late") || text.includes("pending") ? "warn" : "info";
  return <span className={`status ${kind}`}>{children}</span>;
}

function Dashboard({ onView, name }: { onView: (v: View) => void; name:string }) {
  return <>
    <div className="greeting"><div><p className="eyebrow">Today</p><h1>Good morning, {name}</h1><p>Here’s what needs your attention today.</p></div><button className="primary" onClick={() => onView("Attendance")}><Plus size={18}/> Start a class</button></div>
    <section className="metrics">
      <button className="metric featured" onClick={() => onView("Discipline")}><span className="metric-icon"><ClipboardCheck/></span><span><small>Pending actions</small><strong>7</strong></span><ChevronRight/></button>
      <button className="metric" onClick={() => onView("Attendance")}><span className="metric-icon blue"><Users/></span><span><small>Students present</small><strong>184<span>/196</span></strong></span></button>
      <div className="metric"><span className="metric-icon navy"><GraduationCap/></span><span><small>Average grade</small><strong>91<span>%</span></strong></span></div>
      <div className="metric"><span className="metric-icon amber"><Clock3/></span><span><small>Late arrivals</small><strong>5</strong></span></div>
    </section>
    <section className="dashboard-grid">
      <div className="card schedule-card"><div className="card-head"><h2>Today’s schedule</h2><button onClick={() => onView("Schedule")}>View all <ChevronRight size={16}/></button></div>
        {[["8:00 AM","Chassidus Boker","Beit Midrash","In progress"],["9:15 AM","Gemara Le’iyun","Room 201","In progress"],["11:00 AM","Chumash","Room 202","Upcoming"],["1:00 PM","Mincha","Beit Midrash","Upcoming"]].map((r,i)=><div className="schedule-row" key={r[0]}><time>{r[0]}</time><span className="timeline-dot"/><div><b>{r[1]}</b><small>{r[2]} · Rabbi {i%2?"Levi":"Cohen"}</small></div><Status>{r[3]}</Status></div>)}
      </div>
      <div className="right-stack">
        <div className="card attendance-card"><div className="card-head"><h2>Attendance snapshot</h2><button onClick={() => onView("Attendance")}>Details <ChevronRight size={16}/></button></div><div className="attendance-body"><div><strong>94%</strong><span>Present today</span></div><div className="donut" aria-label="94 percent present"><span>94%</span></div><ul><li><i className="dot present"/>Present <b>184</b></li><li><i className="dot late"/>Late <b>7</b></li><li><i className="dot absent"/>Absent <b>5</b></li></ul></div></div>
        <div className="card"><div className="card-head"><h2>Needs attention</h2></div>{[["5 late arrivals","Attendance"],["7 pending actions","Discipline"],["3 mentor check-ins overdue","Mentoring"]].map(([t,v])=><button className="attention" key={t} onClick={()=>onView(v as View)}><span className="attention-icon"><Clock3 size={18}/></span><b>{t}</b><ChevronRight size={18}/></button>)}</div>
      </div>
    </section>
  </>;
}

function StudentsView({initialStudents,isPrincipal,schoolId}:{initialStudents:StudentRow[];isPrincipal:boolean;schoolId?:string}) {
  const [query,setQuery]=useState("");const [all,setAll]=useState(initialStudents);const [adding,setAdding]=useState(false);const [first,setFirst]=useState("");const [last,setLast]=useState("");const [year,setYear]=useState("Shiur Alef");const [error,setError]=useState("");
  const rows=all.filter(s=>s.name.toLowerCase().includes(query.toLowerCase()));
  async function addStudent(){if(!schoolId||!first.trim()||!last.trim())return;setError("");const {data,error}=await createClient().from("students").insert({school_id:schoolId,first_name:first.trim(),last_name:last.trim(),year_level:year}).select("id,first_name,last_name,year_level").single();if(error){setError(error.message);return}setAll([...all,{id:data.id,name:`${data.first_name} ${data.last_name}`,year:data.year_level,status:"Not marked",grade:0,mentor:"Not assigned"}]);setFirst("");setLast("");setAdding(false)}
  return <><div className="page-title"><div><h1>Students</h1><p>{all.length} active bochurim</p></div>{isPrincipal&&<button className="primary" onClick={()=>setAdding(!adding)}><Plus size={18}/>Add student</button>}</div>{adding&&<div className="card quick-form"><label>First name<input value={first} onChange={e=>setFirst(e.target.value)}/></label><label>Last name<input value={last} onChange={e=>setLast(e.target.value)}/></label><label>Year<select value={year} onChange={e=>setYear(e.target.value)}><option>Shiur Alef</option><option>Shiur Beis</option><option>Shiur Gimmel</option><option>Shiur Daled</option></select></label><button className="primary" onClick={addStudent}>Save student</button>{error&&<p className="form-error">{error}</p>}</div>}<div className="toolbar"><div className="searchbox"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search students…"/></div><button className="filter">All years <ChevronDown size={16}/></button></div><div className="card table-card"><table><thead><tr><th>Student</th><th>Year</th><th>Today</th><th>Current grade</th><th>Mashpia</th><th/></tr></thead><tbody>{rows.length?rows.map(s=><tr key={s.id||s.name}><td><div className="person"><span className="avatar small">{s.name.split(" ").map(n=>n[0]).join("")}</span><b>{s.name}</b></div></td><td>{s.year}</td><td><Status>{s.status}</Status></td><td><b>{s.grade?s.grade+"%":"—"}</b></td><td>{s.mentor}</td><td><button className="icon-btn"><MoreHorizontal/></button></td></tr>):<tr><td colSpan={6}><div className="empty-table"><Users/><b>No students yet</b><span>Add the first student to begin building your school roster.</span></div></td></tr>}</tbody></table></div></>;
}

function StaffView(){const [emails,setEmails]=useState("");const [role,setRole]=useState("rebbi");const [links,setLinks]=useState<{email:string;url:string}[]>([]);const [error,setError]=useState("");const [busy,setBusy]=useState(false);async function invite(){const parsed=[...new Set(emails.split(/[\n,]+/).map(e=>e.trim().toLowerCase()).filter(Boolean))];if(!parsed.length){setError("Enter at least one email address.");return}setBusy(true);setError("");const {data,error}=await createClient().rpc("create_staff_invites",{p_emails:parsed,p_roles:[role]});if(error){setError(error.message);setBusy(false);return}setLinks((data||[]).map((row:{email:string;token:string})=>({email:row.email,url:`${location.origin}/invite/${row.token}`})));setEmails("");setBusy(false)}return <><PageTitle title="Staff & invitations" subtitle="Invite staff securely with single-use links"/><div className="invite-grid"><div className="card invite-card"><h2>Invite staff</h2><p>Paste one email per line or separate addresses with commas. This batch receives one role.</p><label>Email addresses<textarea value={emails} onChange={e=>setEmails(e.target.value)} placeholder={"rabbi1@yeshiva.org\nrabbi2@yeshiva.org"}/></label><label>Role<select value={role} onChange={e=>setRole(e.target.value)}><option value="rebbi">Rebbi</option><option value="mashpia">Mashpia</option><option value="principal">Principal</option></select></label>{error&&<p className="form-error">{error}</p>}<button className="primary" onClick={invite} disabled={busy}><UserPlus size={18}/>{busy?"Creating links…":"Create invite links"}</button></div><div className="card invite-card links-card"><h2>New invitation links</h2>{links.length===0?<div className="empty-state"><UserPlus/><p>Generated links will appear here, ready to copy into email, WhatsApp, or text.</p></div>:links.map(item=><div className="invite-link" key={item.email}><div><b>{item.email}</b><small>Expires in 7 days · single use</small></div><button onClick={()=>navigator.clipboard.writeText(item.url)}><Copy/> Copy</button></div>)}</div></div></>}

function GenericView({view}:{view:View}){const content:Record<string,[string,string,string[]]>={Grades:["Grades & testing","Manage assessments, marks, and the automatic point bank",["Upcoming tests","Recent results","Point bank activity"]],Schedule:["Schedule builder","Recurring blocks and today’s operational schedule",["Weekly template","Today’s schedule","PDF schedule rules"]],Mentoring:["Mashpia dashboard","Keep every bochur connected and supported",["Needs attention","Recent conversations","Note requests"]],Reports:["Reports & stats","Cross-module insights and official report cards",["Student hub","Report cards","Data exports"]]};const [title,sub,cards]=content[view];return <><PageTitle title={title} subtitle={sub} action={view==="Reports"?"Generate report":"Create new"}/><div className="feature-grid">{cards.map((c,i)=><div className="card feature-card" key={c}><span className="feature-icon">{i===0?<Sparkles/>:i===1?<FileBarChart/>:<CalendarDays/>}</span><h3>{c}</h3><p>{i===0?"Priority items and the latest activity are collected here.":"Open the full workspace to review and manage records."}</p><button>Open <ChevronRight size={16}/></button></div>)}</div></>}

function PageTitle({title,subtitle,action}:{title:string,subtitle:string,action?:string}){return <div className="page-title"><div><h1>{title}</h1><p>{subtitle}</p></div>{action&&<button className="primary"><Plus size={18}/>{action}</button>}</div>}

export type SetupBundle={periods:PeriodData[];classes:ClassData[];staff:StaffData[];offerings:OfferingData[];students:SetupStudentData[];assignments:AssignmentData[]};

export function AppShell({profileName="Rabbi Cohen",roles=["principal"],schoolId,userId,initialStudents=students,setupData={periods:[],classes:[],staff:[],offerings:[],students:[],assignments:[]},attendanceData={students:[],offerings:[],sessions:[]},disciplineData={types:[],records:[],students:[],snoozeDays:1,snoozeCap:3},gradesData={zmanim:[],offerings:[],tests:[],grades:[],banks:[],transfers:[],students:[]},scheduleData={templates:[],blocks:[],instances:[]},mentoringData={assignments:[],conversations:[],noteRequests:[],statsRequests:[],students:[],mentors:[]},reportsData={students:[],zmanim:[],sessions:[],attendance:[],tests:[],grades:[],discipline:[],conversations:[],reportCards:[]},chatData={staff:[],messages:[]},adminData={schoolName:"",settings:{},staff:[],audit:[],students:[],grades:[],attendance:[],discipline:[]}}:{profileName?:string;roles?:string[];schoolId?:string;userId?:string;initialStudents?:StudentRow[];setupData?:SetupBundle;attendanceData?:AttendanceBundle;disciplineData?:DisciplineBundle;gradesData?:GradesBundle;scheduleData?:ScheduleBundle;mentoringData?:MentoringBundle;reportsData?:ReportsBundle;chatData?:ChatBundle;adminData?:AdminBundle}){const [view,setView]=useState<View>("Dashboard");const [rtl,setRtl]=useState(false);const [mobile,setMobile]=useState(false);const isPrincipal=roles.includes("principal");const isMashpia=roles.includes("mashpia");const allowed=nav.filter(item=>(item.label!=="Setup"||!!schoolId)&&(isPrincipal||(isMashpia?["Dashboard","Students","Mentoring","Reports","Messages"].includes(item.label):!["Staff","Setup"].includes(item.label))));const content=view==="Dashboard"?<Dashboard onView={setView} name={profileName}/>:view==="Students"?<StudentsView initialStudents={initialStudents} isPrincipal={isPrincipal} schoolId={schoolId}/>:view==="Attendance"&&schoolId&&userId?<AttendanceView schoolId={schoolId} userId={userId} initial={attendanceData}/>:view==="Discipline"&&schoolId&&userId?<DisciplineView schoolId={schoolId} userId={userId} isPrincipal={isPrincipal} initial={disciplineData}/>:view==="Grades"&&schoolId&&userId?<GradesView schoolId={schoolId} userId={userId} isPrincipal={isPrincipal} initial={gradesData}/>:view==="Schedule"&&schoolId&&userId?<ScheduleView schoolId={schoolId} userId={userId} isPrincipal={isPrincipal} initial={scheduleData}/>:view==="Mentoring"&&schoolId&&userId?<MentoringView schoolId={schoolId} userId={userId} isPrincipal={isPrincipal} isMashpia={isMashpia} initial={mentoringData}/>:view==="Reports"&&schoolId&&userId?<ReportsView schoolId={schoolId} userId={userId} isPrincipal={isPrincipal} initial={reportsData}/>:view==="Messages"&&schoolId&&userId?<ChatView schoolId={schoolId} userId={userId} initial={chatData}/>:view==="Admin"&&schoolId?<AdminView schoolId={schoolId} initial={adminData}/>:view==="Staff"?<StaffView/>:view==="Setup"&&schoolId?<SetupView schoolId={schoolId} {...setupData}/>:<GenericView view={view}/>;async function signOut(){await createClient().auth.signOut();location.href="/login"}return <div className="app" dir={rtl?"rtl":"ltr"}><aside className={mobile?"sidebar open":"sidebar"}><div className="side-top"><Logo/><button className="close-mobile" onClick={()=>setMobile(false)}><X/></button></div><nav>{allowed.map(({label,icon:Icon})=><button key={label} className={view===label?"active":""} onClick={()=>{setView(label);setMobile(false)}}><Icon/><span>{label}</span>{label==="Discipline"&&disciplineData.records.filter(r=>r.status==="pending").length>0&&<em>{disciplineData.records.filter(r=>r.status==="pending").length}</em>}</button>)}</nav><div className="side-bottom">{isPrincipal&&<button onClick={()=>{setView("Admin");setMobile(false)}}><Settings/><span>Settings & data</span></button>}<button onClick={signOut}><LogOut/><span>Sign out</span></button></div></aside>{mobile&&<button className="backdrop" onClick={()=>setMobile(false)} aria-label="Close menu"/>}<div className="shell"><header><button className="menu-btn" onClick={()=>setMobile(true)}><Menu/></button><div className="mobile-logo"><Logo/></div><div className="header-search"><Search/><input placeholder="Search students, classes…"/></div><div className="header-actions"><button className="lang" onClick={()=>setRtl(!rtl)}><Languages/><span>{rtl?"English":"עברית"}</span></button><button className="bell"><Bell/><i>3</i></button><div className="profile"><span className="avatar">{profileName.split(" ").map(n=>n[0]).slice(0,2).join("")}</span><div><b>{profileName}</b><small>{roles.map(r=>r[0].toUpperCase()+r.slice(1)).join(" · ")}</small></div><ChevronDown size={16}/></div></div></header><main>{content}</main></div></div>}

export default function HomePage(){return <AppShell/>}
