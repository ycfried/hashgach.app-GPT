import type { Metadata } from "next";
import "@fontsource-variable/source-sans-3";
import "./globals.css";

export const metadata: Metadata = { title: "Hashgacha — Yeshiva Management", description: "Attendance, discipline, grades, scheduling, mentoring and reports in one place." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
