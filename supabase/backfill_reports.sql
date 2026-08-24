-- ============================================================
--  Backfill attendance_reports from attendance that was marked
--  but never finalized with the "Save report" button.
--
--  Run in the Supabase SQL Editor (it runs as postgres, so RLS
--  doesn't get in the way). Safe to re-run: it upserts on
--  (report_date, mandal).
--
--  Mirrors the portal's own report logic exactly:
--    present = anyone marked present, active or not
--    absent  = ACTIVE roster members not marked present
--    total   = present + absent
--  Both name lists are sorted, matching splitRoster() in
--  src/lib/attendanceReport.js.
-- ============================================================

-- ---------- 1. Preview: what's marked but not finalized? ----------
select s.session_date,
       s.mandal,
       count(*) filter (where r.present) as present,
       max(r.marked_at)                  as last_marked,
       (rep.id is not null)              as already_finalized
from public.attendance_sessions s
left join public.attendance_records r on r.session_id = s.id
left join public.attendance_reports rep
       on rep.report_date = s.session_date and rep.mandal = s.mandal
group by s.session_date, s.mandal, rep.id
order by s.session_date desc, s.mandal;


-- ---------- 2. Backfill one day ----------
-- Change the date, or swap the `where` for the "every missing day"
-- variant in section 3.
with sheet as (
  select s.id, s.session_date, s.mandal, s.created_by
  from public.attendance_sessions s
  where s.session_date = date '2026-08-24'
),
roster as (
  select sh.session_date,
         sh.mandal,
         sh.created_by,
         m.name,
         m.active,
         coalesce(r.present, false) as present
  from sheet sh
  join public.members m on m.mandal = sh.mandal
  left join public.attendance_records r
         on r.session_id = sh.id and r.member_id = m.id
)
insert into public.attendance_reports
  (report_date, mandal, total, present_count, absent_count,
   present_names, absent_names, finalized_by, finalized_at)
select
  session_date,
  mandal,
  count(*) filter (where present)
    + count(*) filter (where active and not present),
  count(*) filter (where present),
  count(*) filter (where active and not present),
  coalesce(jsonb_agg(name order by name) filter (where present), '[]'::jsonb),
  coalesce(jsonb_agg(name order by name) filter (where active and not present), '[]'::jsonb),
  created_by,
  now()
from roster
group by session_date, mandal, created_by
on conflict (report_date, mandal) do update set
  total         = excluded.total,
  present_count = excluded.present_count,
  absent_count  = excluded.absent_count,
  present_names = excluded.present_names,
  absent_names  = excluded.absent_names,
  finalized_by  = excluded.finalized_by,
  finalized_at  = excluded.finalized_at;


-- ---------- 3. Variant: every day that was marked but never finalized ----------
-- Replace the `sheet` CTE above with this to sweep the whole backlog
-- without touching days that were already finalized deliberately:
--
--   sheet as (
--     select s.id, s.session_date, s.mandal, s.created_by
--     from public.attendance_sessions s
--     where not exists (
--       select 1 from public.attendance_reports rep
--       where rep.report_date = s.session_date and rep.mandal = s.mandal
--     )
--   ),
