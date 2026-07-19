# Hashgacha

A bilingual, mobile-first yeshiva management platform built with Next.js, Supabase, and Vercel.

## Included in this foundation

- Role-aware operational dashboard
- Student directory and mobile attendance session flow
- Discipline queue with lateness-linked actions
- Grade, schedule, mentoring, reporting, and data-export workspaces
- English/Hebrew RTL mode
- Supabase-ready auth clients and multi-tenant database migration
- Responsive interaction patterns for teachers using phones

## Local development

1. Copy `.env.example` to `.env.local` and add Supabase credentials.
2. Run `npm install`.
3. Run `npm run dev`.

The migration in `supabase/migrations` defines the v1 data foundation, tenant-aware RLS, audit logging, automatic lateness consequences, and fine escalation.
