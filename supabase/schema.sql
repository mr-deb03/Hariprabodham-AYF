-- ============================================================
--  HariPrabodham Karyakarta Portal — Phase 1 schema
--  Run this in Supabase: Dashboard → SQL Editor → New query → paste → Run.
--  Safe to re-run (uses IF NOT EXISTS / OR REPLACE).
-- ============================================================

-- ---------- Enums ----------
do $$ begin
  create type user_role as enum ('admin', 'karyakarta');
exception when duplicate_object then null; end $$;

do $$ begin
  create type approval_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

-- ---------- Profiles (one row per auth user) ----------
create table if not exists public.profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  full_name           text not null default '',
  mobile              text,
  mandal              text,                      -- HK / GK / SY / BR / DS / CR
  role                user_role not null default 'karyakarta',
  status              approval_status not null default 'pending',
  is_attendance_taker boolean not null default false,
  assigned_locations  text[] not null default '{}',   -- used in Phase 2
  created_at          timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- ---------- Helper: is the caller an approved admin? ----------
-- SECURITY DEFINER bypasses RLS, so policies can call this without recursion.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and status = 'approved'
  );
$$;

-- ---------- Auto-create a profile when someone signs up ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, mobile, mandal)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'mobile',
    new.raw_user_meta_data->>'mandal'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Block privilege escalation ----------
-- A normal user may edit their own name/mobile/mandal, but NOT their role,
-- approval status, or attendance permissions. Only admins can change those.
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only restrict end users acting through the API. Direct DB access (SQL
  -- editor / service role) has auth.uid() = null and is trusted — that's how
  -- the first admin is bootstrapped. Authenticated admins may change anything;
  -- authenticated non-admins cannot touch role/status/attendance fields.
  if auth.uid() is not null and not public.is_admin() then
    new.role               := old.role;
    new.status             := old.status;
    new.is_attendance_taker := old.is_attendance_taker;
    new.assigned_locations := old.assigned_locations;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_columns_trg on public.profiles;
create trigger protect_profile_columns_trg
  before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- ---------- Row Level Security policies ----------
drop policy if exists "profiles read own or admin all" on public.profiles;
create policy "profiles read own or admin all"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles update own or admin all" on public.profiles;
create policy "profiles update own or admin all"
  on public.profiles for update
  using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

-- Inserts happen only through the signup trigger (SECURITY DEFINER), so no
-- INSERT policy is granted to clients. Deletes are admin-only via the
-- dashboard / service role, so no DELETE policy either.

-- ============================================================
--  BOOTSTRAP THE FIRST ADMIN
--  1. Register once through the website form with YOUR email.
--  2. Then run the line below (replace the email) to promote yourself:
--
--    update public.profiles
--    set role = 'admin', status = 'approved'
--    where id = (select id from auth.users where email = 'you@example.com');
-- ============================================================
