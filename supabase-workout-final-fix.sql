-- FITNESS GYM final workout-log fix
-- Run this once in Supabase SQL Editor.

alter table if exists public.workout_logs
  add column if not exists created_by uuid references auth.users(id) on delete set null;

create table if not exists public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  customer_id text not null references public.customers(id) on delete cascade,
  workout_title text not null,
  workout_day text not null default '',
  workout_date date not null default current_date,
  sets_completed integer not null default 0 check (sets_completed >= 0),
  reps text not null default '',
  weight numeric(10,2) not null default 0 check (weight >= 0),
  duration text not null default '',
  notes text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.workout_logs enable row level security;
drop policy if exists "staff can manage workout logs" on public.workout_logs;
create policy "staff can manage workout logs"
on public.workout_logs for all to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())))
with check (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

grant select, insert, update, delete on public.workout_logs to authenticated;
notify pgrst, 'reload schema';
