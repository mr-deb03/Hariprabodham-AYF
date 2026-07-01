-- Attendance report snapshots — an immutable record of the end-of-day report
-- "as finalized", so it stays fixed even if attendance records are later edited.
-- Run in the Supabase SQL Editor after attendance.sql. Safe to re-run.

create table if not exists public.attendance_reports (
  id            uuid primary key default gen_random_uuid(),
  report_date   date not null,
  mandal        text not null,
  total         int  not null default 0,   -- present + absent shown
  present_count int  not null default 0,
  absent_count  int  not null default 0,
  present_names jsonb not null default '[]'::jsonb,
  absent_names  jsonb not null default '[]'::jsonb,
  finalized_by  uuid references public.profiles(id),
  finalized_at  timestamptz not null default now(),
  unique (report_date, mandal)
);
create index if not exists attendance_reports_date_idx on public.attendance_reports (report_date desc);

alter table public.attendance_reports enable row level security;

-- Any approved karyakarta can read saved reports.
drop policy if exists "reports read approved" on public.attendance_reports;
create policy "reports read approved" on public.attendance_reports
  for select using (public.is_approved());

-- Admins and the mandal's attendance takers can save/overwrite its snapshot.
drop policy if exists "reports write markers" on public.attendance_reports;
create policy "reports write markers" on public.attendance_reports
  for all
  using (public.can_mark_mandal(mandal))
  with check (public.can_mark_mandal(mandal));
