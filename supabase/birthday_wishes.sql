-- Automated WhatsApp birthday wishes.
--
-- A daily cron calls the `birthday-wishes` Edge Function, which finds members
-- whose birthday is today and sends each an approved WhatsApp template via
-- Meta's Cloud API. This file creates the de-dupe log and the schedule.
--
-- Run in the Supabase SQL Editor. Safe to re-run (idempotent).

-- ---------- Log: one row per member per year, so nobody is wished twice ----
create table if not exists public.birthday_wish_log (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references public.members(id) on delete cascade,
  year       int  not null,
  channel    text not null default 'whatsapp',
  status     text not null,                       -- 'sent' | 'failed'
  detail     text,                                -- provider error, if any
  sent_at    timestamptz not null default now(),
  unique (member_id, year, channel)               -- the de-dupe guard
);
create index if not exists birthday_wish_log_year_idx
  on public.birthday_wish_log (year);

alter table public.birthday_wish_log enable row level security;

-- Approved users can see the log (so the portal can show "wished" state);
-- only admins may write from a client. The Edge Function uses the service
-- role, which bypasses RLS entirely.
drop policy if exists "wish log read approved" on public.birthday_wish_log;
create policy "wish log read approved" on public.birthday_wish_log
  for select using (public.is_approved());

drop policy if exists "wish log admin write" on public.birthday_wish_log;
create policy "wish log admin write" on public.birthday_wish_log
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- Daily schedule ------------------------------------------------
-- Requires the pg_cron + pg_net extensions (Database → Extensions, or below).
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 03:30 UTC = 09:00 IST. Change the cron expression to shift the send time.
--
-- ⚠️ Replace <PROJECT_REF> and <SERVICE_ROLE_KEY> before running. The key is
-- the service_role key (Project Settings → API). It stays inside the database,
-- never in the browser.
select cron.unschedule('birthday-wishes-daily')
  where exists (select 1 from cron.job where jobname = 'birthday-wishes-daily');

select cron.schedule(
  'birthday-wishes-daily',
  '30 3 * * *',
  $$
  select net.http_post(
    url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/birthday-wishes',
    headers := jsonb_build_object(
                 'Content-Type',  'application/json',
                 'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
               ),
    body    := '{}'::jsonb
  );
  $$
);

-- Handy checks:
--   select * from cron.job;                                  -- is it scheduled?
--   select * from cron.job_run_details order by start_time desc limit 5;
--   select * from public.birthday_wish_log order by sent_at desc limit 20;
