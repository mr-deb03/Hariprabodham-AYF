-- Phase 3: private "Satsang Videos" for approved karyakartas.
-- Run this in the Supabase SQL Editor. Safe to re-run.

create table if not exists public.videos (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  youtube_id  text not null,          -- the 11-char YouTube video id
  description text,
  category    text,                   -- optional grouping label
  sort_order  int  default 0,         -- lower shows first
  created_at  timestamptz default now(),
  created_by  uuid references auth.users(id)
);

alter table public.videos enable row level security;

-- Any approved karyakarta (and admins) can view the videos.
drop policy if exists "videos_select_approved" on public.videos;
create policy "videos_select_approved" on public.videos
  for select using (public.is_approved());

-- Only admins can add / edit / remove videos.
drop policy if exists "videos_insert_admin" on public.videos;
create policy "videos_insert_admin" on public.videos
  for insert with check (public.is_admin());

drop policy if exists "videos_update_admin" on public.videos;
create policy "videos_update_admin" on public.videos
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "videos_delete_admin" on public.videos;
create policy "videos_delete_admin" on public.videos
  for delete using (public.is_admin());
