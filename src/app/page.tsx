"use client";

import { useMemo, useState } from "react";
import {
  Bell, BookOpen, CalendarDays, Check, ChevronDown, ChevronRight, ClipboardCheck,
  Clock3, FileBarChart, GraduationCap, Home, Languages, Menu, MessageCircle,
  MoreHorizontal, Plus, Search, Settings, ShieldCheck, Sparkles, Users, X,
} from "lucide-react";

type View = "Dashboard" | "Students" | "Attendance" | "Discipline" | "Grades" | "Schedule" | "Mentoring" | "Reports";

const nav: { label: View; icon: typeof Home }[] = [
  { label: "Dashboard", icon: Home }, { label: "Students", icon: Users },
  { label: "Attendance", icon: ClipboardCheck }, { label: "Discipline", icon: ShieldCheck },
  { label: "Grades", icon: GraduationCap }, { label: "Schedule", icon: CalendarDays },
  { label: "Mentoring", icon: MessageCircle }, { label: "Reports", icon: FileBarChart },
];

const students = [
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

function Dashboard({ onView }: { onView: (v: View) => void }) {
  return <>
    <div className="greeting"><div><p className="eyebrow">Thursday, July 16</p><h1>Good morning, Rabbi Cohen</h1><p>Here’s what needs your attention today.</p></div><button className="primary" onClick={() => onView("Attendance")}><Plus size={18}/> Start a class</button></div>
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

function StudentsView() {
  const [query,setQuery]=useState("");
  const rows=students.filter(s=>s.name.toLowerCase().includes(query.toLowerCase()));
  return <><PageTitle title="Students" subtitle="196 active bochurim across 8 classes" action="Add student"/><div className="toolbar"><div className="searchbox"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search students…"/></div><button className="filter">All years <ChevronDown size={16}/></button></div><div className="card table-card"><table><thead><tr><th>Student</th><th>Year</th><th>Today</th><th>Current grade</th><th>Mashpia</th><th/></tr></thead><tbody>{rows.map(s=><tr key={s.name}><td><div className="person"><span className="avatar small">{s.name.split(" ").map(n=>n[0]).join("")}</span><b>{s.name}</b></div></td><td>{s.year}</td><td><Status>{s.status}</Status></td><td><b>{s.grade}%</b></td><td>{s.mentor}</td><td><button className="icon-btn"><MoreHorizontal/></button></td></tr>)}</tbody></table></div></>;
}

function AttendanceView() {
  const [started,setStarted]=useState(false); const [marks,setMarks]=useState<Record<string,string>>({});
  const options=["Present","Late","Absent","Excused"];
  return <><PageTitle title="Today’s classes" subtitle="Thursday, July 16 · 4 scheduled blocks"/>{!started?<div className="class-list">{[["8:00–9:00","Chassidus Boker","Room 201"],["11:00–12:10","Gemara Le’iyun","Beit Midrash"],["12:30–1:30","Gemara B’kius","Room 203"]].map((c,i)=><div className={`card class-card ${i===1?"next":""}`} key={c[0]}><div className="class-time"><Clock3/><b>{c[0]}</b></div><div><h3>{c[1]}</h3><p>{c[2]} · 24 students</p></div>{i===1?<button className="primary" onClick={()=>setStarted(true)}>Start class <ChevronRight size={17}/></button>:<Status>{i===0?"Completed":"Upcoming"}</Status>}</div>)}</div>:<div className="card live-roster"><div className="live-head"><div><span className="live-label"><i/> LIVE CLASS</span><h2>Gemara Le’iyun</h2><p>Started 11:02 AM · 24 students</p></div><button className="secondary" onClick={()=>setStarted(false)}>Complete class</button></div><button className="mark-all" onClick={()=>setMarks(Object.fromEntries(students.map(s=>[s.name,"Present"]))) }><Check/> Mark all present</button>{students.map(s=><div className="roster-row" key={s.name}><div className="person"><span className="avatar small">{s.name.split(" ").map(n=>n[0]).join("")}</span><b>{s.name}</b></div><div className="segmented">{options.map(o=><button key={o} className={marks[s.name]===o?`selected ${o.toLowerCase()}`:""} onClick={()=>setMarks({...marks,[s.name]:o})}>{o}</button>)}</div></div>)}</div>}</>;
}

function DisciplineView(){return <><PageTitle title="Pending actions" subtitle="Review, exact, snooze, or waive discipline records" action="Add action"/><div className="tabs"><button className="active">Pending <span>7</span></button><button>Exacted</button><button>Waived</button></div><div className="card table-card"><table><thead><tr><th>Student</th><th>Action</th><th>Assigned</th><th>Due</th><th>Amount</th><th/></tr></thead><tbody>{[["Dovid Katz","Late 15–24 min","Auto · Attendance","Today","$5.00"],["Yossi Friedman","Missed seder","Rabbi Levi","Yesterday","—"],["Ari Stein","Exceptional participation","Rabbi Cohen","Today","+5 pts"],["Moshe Levi","Late 25+ min","Auto · Attendance","Jul 14","$10.50"]].map((r,i)=><tr key={r[0]+r[1]}><td><b>{r[0]}</b></td><td><Status>{r[1]}</Status></td><td>{r[2]}</td><td className={i===1||i===3?"overdue":""}>{r[3]}</td><td><b>{r[4]}</b></td><td><div className="row-actions"><button className="tiny-primary">Exact</button><button className="icon-btn"><MoreHorizontal/></button></div></td></tr>)}</tbody></table></div></>}

function GenericView({view}:{view:View}){const content:Record<string,[string,string,string[]]>={Grades:["Grades & testing","Manage assessments, marks, and the automatic point bank",["Upcoming tests","Recent results","Point bank activity"]],Schedule:["Schedule builder","Recurring blocks and today’s operational schedule",["Weekly template","Today’s schedule","PDF schedule rules"]],Mentoring:["Mashpia dashboard","Keep every bochur connected and supported",["Needs attention","Recent conversations","Note requests"]],Reports:["Reports & stats","Cross-module insights and official report cards",["Student hub","Report cards","Data exports"]]};const [title,sub,cards]=content[view];return <><PageTitle title={title} subtitle={sub} action={view==="Reports"?"Generate report":"Create new"}/><div className="feature-grid">{cards.map((c,i)=><div className="card feature-card" key={c}><span className="feature-icon">{i===0?<Sparkles/>:i===1?<FileBarChart/>:<CalendarDays/>}</span><h3>{c}</h3><p>{i===0?"Priority items and the latest activity are collected here.":"Open the full workspace to review and manage records."}</p><button>Open <ChevronRight size={16}/></button></div>)}</div></>}

function PageTitle({title,subtitle,action}:{title:string,subtitle:string,action?:string}){return <div className="page-title"><div><h1>{title}</h1><p>{subtitle}</p></div>{action&&<button className="primary"><Plus size={18}/>{action}</button>}</div>}

export default function HomePage(){const [view,setView]=useState<View>("Dashboard");const [rtl,setRtl]=useState(false);const [mobile,setMobile]=useState(false);const content=useMemo(()=>view==="Dashboard"?<Dashboard onView={setView}/>:view==="Students"?<StudentsView/>:view==="Attendance"?<AttendanceView/>:view==="Discipline"?<DisciplineView/>:<GenericView view={view}/>,[view]);return <div className="app" dir={rtl?"rtl":"ltr"}><aside className={mobile?"sidebar open":"sidebar"}><div className="side-top"><Logo/><button className="close-mobile" onClick={()=>setMobile(false)}><X/></button></div><nav>{nav.map(({label,icon:Icon})=><button key={label} className={view===label?"active":""} onClick={()=>{setView(label);setMobile(false)}}><Icon/><span>{label}</span>{label==="Discipline"&&<em>7</em>}</button>)}</nav><div className="side-bottom"><button><Settings/><span>Settings</span></button><div className="support"><MessageCircle/><div><b>Need help?</b><small>Chat with support</small></div></div></div></aside>{mobile&&<button className="backdrop" onClick={()=>setMobile(false)} aria-label="Close menu"/>}<div className="shell"><header><button className="menu-btn" onClick={()=>setMobile(true)}><Menu/></button><div className="mobile-logo"><Logo/></div><div className="header-search"><Search/><input placeholder="Search students, classes…"/></div><div className="header-actions"><button className="lang" onClick={()=>setRtl(!rtl)}><Languages/><span>{rtl?"English":"עברית"}</span></button><button className="bell"><Bell/><i>3</i></button><div className="profile"><span className="avatar">RC</span><div><b>Rabbi Cohen</b><small>Principal</small></div><ChevronDown size={16}/></div></div></header><main>{content}</main></div></div>}
