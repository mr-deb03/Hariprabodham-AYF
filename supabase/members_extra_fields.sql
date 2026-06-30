-- Extra member details for the "Add member" form, aligned to the master sheet:
--   Education  ·  Education Status (Pursuing/Completed)  ·  Occupation (Student/Job/Business)
-- Run this in the Supabase SQL Editor. Safe to re-run (idempotent).

alter table public.members
  add column if not exists parent_mobile text,
  add column if not exists occupation    text,
  add column if not exists education      text,   -- e.g. "Graduate (B.Com, BSc, etc)", "SSC"
  add column if not exists dob            date,   -- date of birth
  add column if not exists study_status  text check (study_status in ('pursuing','completed')),
  add column if not exists team          text,   -- e.g. HK01 (mandal + team segment)
  -- legacy columns (no longer used by the form, kept so old data isn't dropped)
  add column if not exists standard      text,
  add column if not exists qualification text,
  add column if not exists designation   text;

-- Occupation is now Student / Job / Business (was student / working).
-- Migrate any earlier "working" rows, then (re)apply the constraint.
update public.members set occupation = 'job' where occupation = 'working';
alter table public.members drop constraint if exists members_occupation_check;
alter table public.members
  add constraint members_occupation_check
  check (occupation is null or occupation in ('student','job','business'));

-- Unique index on code so the Excel import can upsert by Roll No (AYG code)
-- instead of creating duplicates. (NULL codes are allowed and stay distinct.)
create unique index if not exists members_code_uidx on public.members (code);

-- Backfill `team` from the existing AYG code (first 4 chars = mandal + team no).
update public.members
   set team = left(code, 4)
 where team is null
   and code is not null
   and length(code) >= 6;
