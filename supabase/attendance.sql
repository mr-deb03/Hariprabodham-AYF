-- ============================================================
--  Karyakarta Portal — Phase 2: Attendance
--  Run AFTER schema.sql, in Supabase SQL Editor. Safe to re-run.
-- ============================================================

-- ---------- Members (master roster from the sheet) ----------
create table if not exists public.members (
  id         uuid primary key default gen_random_uuid(),
  code       text,                       -- optional code from the master sheet
  name       text not null,
  mandal     text not null,              -- HK / GK / SY / BR / DS / CR
  mobile     text,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists members_mandal_idx on public.members (mandal);

-- ---------- Attendance sessions (one per date + mandal) ----------
create table if not exists public.attendance_sessions (
  id           uuid primary key default gen_random_uuid(),
  session_date date not null,
  mandal       text not null,
  created_by   uuid references public.profiles(id),
  created_at   timestamptz not null default now(),
  unique (session_date, mandal)
);

-- ---------- Attendance records (one per member per session) ----------
create table if not exists public.attendance_records (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.attendance_sessions(id) on delete cascade,
  member_id  uuid not null references public.members(id) on delete cascade,
  present    boolean not null default false,
  marked_by  uuid references public.profiles(id),
  marked_at  timestamptz not null default now(),
  unique (session_id, member_id)
);
create index if not exists att_records_session_idx on public.attendance_records (session_id);

alter table public.members enable row level security;
alter table public.attendance_sessions enable row level security;
alter table public.attendance_records enable row level security;

-- ---------- Helpers ----------
create or replace function public.is_approved()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and status = 'approved');
$$;

-- Can the caller mark attendance for a given mandal?
-- Admins can mark any; attendance takers only their assigned mandals.
create or replace function public.can_mark_mandal(m text)
returns boolean language sql security definer stable set search_path = public as $$
  select public.is_admin() or exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'approved'
      and is_attendance_taker and m = any(assigned_locations)
  );
$$;

-- ---------- RLS: members ----------
drop policy if exists "members read approved" on public.members;
create policy "members read approved" on public.members
  for select using (public.is_approved());

drop policy if exists "members admin write" on public.members;
create policy "members admin write" on public.members
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- RLS: attendance_sessions ----------
drop policy if exists "sessions read approved" on public.attendance_sessions;
create policy "sessions read approved" on public.attendance_sessions
  for select using (public.is_approved());

drop policy if exists "sessions write markers" on public.attendance_sessions;
create policy "sessions write markers" on public.attendance_sessions
  for all using (public.can_mark_mandal(mandal)) with check (public.can_mark_mandal(mandal));

-- ---------- RLS: attendance_records ----------
drop policy if exists "records read approved" on public.attendance_records;
create policy "records read approved" on public.attendance_records
  for select using (public.is_approved());

drop policy if exists "records write markers" on public.attendance_records;
create policy "records write markers" on public.attendance_records
  for all
  using (public.can_mark_mandal((select s.mandal from public.attendance_sessions s where s.id = session_id)))
  with check (public.can_mark_mandal((select s.mandal from public.attendance_sessions s where s.id = session_id)));

-- ============================================================
--  OPTIONAL sample members for testing (only inserts if the table is empty).
--  Delete these and import the real roster before going live.
-- ============================================================
insert into public.members (name, mandal, mobile)
select v.name, v.mandal, v.mobile
from (values
  ('Sample Member HK-1','HK','9000000001'),
  ('Sample Member HK-2','HK','9000000002'),
  ('Sample Member GK-1','GK','9000000003'),
  ('Sample Member GK-2','GK','9000000004'),
  ('Sample Member SY-1','SY','9000000005'),
  ('Sample Member BR-1','BR','9000000006'),
  ('Sample Member BR-2','BR','9000000007'),
  ('Sample Member DS-1','DS','9000000008'),
  ('Sample Member CR-1','CR','9000000009')
) as v(name, mandal, mobile)
where not exists (select 1 from public.members);
