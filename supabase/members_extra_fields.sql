-- Extra member details for the "Add member" form.
-- Run this ONCE in the Supabase SQL Editor (Dashboard → SQL Editor → New query).

alter table public.members
  add column if not exists parent_mobile text,
  add column if not exists occupation    text check (occupation in ('student','working')),
  add column if not exists standard      text,   -- students: e.g. 10th, 12th, FY BCom
  add column if not exists study_status  text check (study_status in ('pursuing','completed')),
  add column if not exists qualification text,   -- working: latest studies
  add column if not exists designation   text,   -- working: job title
  add column if not exists team          text;   -- e.g. HK01 (mandal + team segment)

-- Backfill `team` from the existing AYG code (first 4 chars = mandal + team no).
-- e.g. HK0101, HK0102 … all belong to team HK01.
update public.members
   set team = left(code, 4)
 where team is null
   and code is not null
   and length(code) >= 6;
