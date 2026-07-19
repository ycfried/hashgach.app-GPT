"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, LoaderCircle, LockKeyhole, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email,setEmail]=useState(""); const [password,setPassword]=useState("");
  const [error,setError]=useState(""); const [busy,setBusy]=useState(false);
  async function submit(event:FormEvent){event.preventDefault();setBusy(true);setError("");const {error}=await createClient().auth.signInWithPassword({email,password});if(error){setError(error.message);setBusy(false);return}router.push(new URLSearchParams(location.search).get("next")||"/app");router.refresh()}
  return <main className="auth-page"><section className="auth-panel"><div className="auth-brand"><span><BookOpen/></span>Hashgacha</div><div className="auth-copy"><p className="eyebrow">Staff portal</p><h1>Welcome back</h1><p>Sign in to manage your classes, students, and daily responsibilities.</p></div><form onSubmit={submit} className="auth-form"><label>Email address<div><Mail/><input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="rabbi@yeshiva.org"/></div></label><label>Password<div><LockKeyhole/><input type="password" required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Your password"/></div></label>{error&&<p className="form-error">{error}</p>}<button className="primary auth-submit" disabled={busy}>{busy?<LoaderCircle className="spin"/>:"Sign in"}</button></form><p className="auth-note">New staff join through a private invitation from their principal.</p><a className="demo-link" href="/">Preview the interface without signing in</a></section><aside className="auth-art"><div><span>Built for the rhythm of yeshiva life.</span><h2>One calm place for attendance, growth, accountability, and connection.</h2></div></aside></main>
}
