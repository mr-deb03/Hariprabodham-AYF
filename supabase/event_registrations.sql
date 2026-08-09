-- ============================================================
--  Event registrations — public sign-up for the featured event
--  Run in Supabase: Dashboard → SQL Editor → New query → paste → Run.
--  Safe to re-run (uses IF NOT EXISTS / DROP POLICY IF EXISTS).
-- ============================================================

create table if not exists public.event_registrations (
  id               uuid primary key default gen_random_uuid(),

  -- Registrations are scoped per event. event_slug is the stable key the
  -- uniqueness rule keys off; event_name is the human label as it read on the
  -- site at the time, kept so old rows stay legible after a rename.
  event_slug       text not null,
  event_name       text not null,

  reference        text not null,
  full_name        text not null,
  mobile           text not null,

  -- Normalised to the last 10 digits, so +91 98765 43210, 098765-43210 and
  -- 9876543210 all collapse to one key. Generated and STORED rather than
  -- computed in the app: the unique index below then cannot be sidestepped by
  -- entering the same number in a different format.
  mobile_key       text generated always as
                     (right(regexp_replace(mobile, '\D', '', 'g'), 10)) stored,

  occupation       text not null,
  education        text not null,
  education_status text not null,
  specialization   text not null,
  group_name       text not null,

  created_at       timestamptz not null default now(),

  -- Backstops for a publicly writable table. The form validates before it
  -- submits; these stop malformed or oversized rows landing by other means.
  constraint event_registrations_mobile_valid
    check (mobile_key ~ '^\d{10}$'),
  constraint event_registrations_lengths
    check (
      char_length(reference)        between 1 and 120 and
      char_length(full_name)        between 1 and 120 and
      char_length(specialization)   between 1 and 120 and
      char_length(event_slug)       between 1 and 80  and
      char_length(event_name)       between 1 and 120
    )
);

-- THE duplicate rule: one registration per mobile number per event.
create unique index if not exists event_registrations_event_mobile_key
  on public.event_registrations (event_slug, mobile_key);

-- Admin roster queries read newest-first, usually filtered to one event.
create index if not exists event_registrations_event_created_idx
  on public.event_registrations (event_slug, created_at desc);

alter table public.event_registrations enable row level security;

-- ---------- Policies ----------
-- Anyone may register.
drop policy if exists "event_registrations public insert" on public.event_registrations;
create policy "event_registrations public insert"
  on public.event_registrations for insert
  to anon, authenticated
  with check (true);

-- Deliberately NO select policy for anon. The "already registered" check runs
-- off the unique index — the insert fails with SQLSTATE 23505 and the form
-- reads that — rather than querying first. So the browser never needs read
-- access, and the registration list cannot be enumerated by a visitor.
drop policy if exists "event_registrations admin read" on public.event_registrations;
create policy "event_registrations admin read"
  on public.event_registrations for select
  to authenticated
  using (public.is_admin());

-- Corrections and removals are admin-only.
drop policy if exists "event_registrations admin write" on public.event_registrations;
create policy "event_registrations admin write"
  on public.event_registrations for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "event_registrations admin delete" on public.event_registrations;
create policy "event_registrations admin delete"
  on public.event_registrations for delete
  to authenticated
  using (public.is_admin());

-- ============================================================
--  Export a single event's registrations:
--
--    select created_at, full_name, mobile, reference, group_name,
--           occupation, education, education_status, specialization
--    from public.event_registrations
--    where event_slug = 'parayan-2026'
--    order by created_at;
-- ============================================================
