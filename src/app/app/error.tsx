"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

export default function AppError({reset}:{error:Error&{digest?:string};reset:()=>void}){return <main className="fatal-state"><AlertTriangle/><h1>We couldn’t load the workspace</h1><p>Your data was not changed. Try loading it again; if the problem continues, sign out and back in.</p><button className="primary" onClick={reset}><RefreshCw/>Try again</button></main>}
