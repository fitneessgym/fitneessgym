-- FITNESS GYM: make public website media visible to every visitor
-- Run this file ONCE in Supabase SQL Editor for the connected project.
-- It does not grant public write/update/delete access.

-- 1) Public storage bucket for gallery/product media.
insert into storage.buckets (id, name, public)
values ('site-media', 'site-media', true)
on conflict (id) do update set public = true;

-- 2) Anyone can read media files; only admins can change them.
drop policy if exists "public can read site media" on storage.objects;
create policy "public can read site media"
on storage.objects for select
using (bucket_id = 'site-media');

-- 3) Keep product data public for active products only.
alter table if exists public.products enable row level security;
drop policy if exists "public can read active products" on public.products;
create policy "public can read active products"
on public.products for select
to anon, authenticated
using (active = true);
grant select on public.products to anon, authenticated;

-- 4) Site settings (gallery configuration) must be readable by visitors.
alter table if exists public.site_settings enable row level security;
drop policy if exists "public can read site settings" on public.site_settings;
create policy "public can read site settings"
on public.site_settings for select
to anon, authenticated
using (true);
grant select on public.site_settings to anon, authenticated;
