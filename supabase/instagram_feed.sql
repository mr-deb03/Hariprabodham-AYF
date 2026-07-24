-- Auto-updating Instagram feed on the Media page.
--
-- The `instagram-feed` Edge Function reads the site's latest Instagram posts.
-- Instagram's long-lived tokens expire after 60 days, so the function refreshes
-- the token as it nears expiry and stores the new one here — without this table
-- the feed would quietly stop updating two months after setup.
--
-- Run in the Supabase SQL Editor. Safe to re-run (idempotent).

-- ---------- The single stored token ---------------------------------------
create table if not exists public.instagram_token (
  id            smallint primary key default 1,
  access_token  text not null,
  expires_at    timestamptz,                      -- null until the first refresh
  updated_at    timestamptz not null default now(),
  constraint instagram_token_one_row check (id = 1)
);

-- RLS on with NO policies: nothing that goes through the API can read this.
-- The Edge Function uses the service role, which bypasses RLS entirely.
alter table public.instagram_token enable row level security;

-- ---------- Keep the token fresh even in a quiet month ---------------------
-- The function refreshes on demand, but only when someone loads the site. A
-- weekly nudge means the token can't lapse during a lull in traffic.
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ⚠️ Replace <PROJECT_REF> before running.
select cron.unschedule('instagram-token-refresh')
  where exists (select 1 from cron.job where jobname = 'instagram-token-refresh');

select cron.schedule(
  'instagram-token-refresh',
  '0 4 * * 1',                                    -- Mondays, 04:00 UTC
  $$
  select net.http_get(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/instagram-feed?refresh=1'
  );
  $$
);

-- Handy checks:
--   select id, expires_at, updated_at from public.instagram_token;  -- never select the token itself
--   select * from cron.job where jobname = 'instagram-token-refresh';
--   select * from cron.job_run_details order by start_time desc limit 5;
