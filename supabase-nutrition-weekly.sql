-- FITNESS GYM - Weekly nutrition plans
-- Run once in Supabase SQL Editor after the existing schema.
-- The current week is selected automatically by date (Saturday-Friday).

create table if not exists public.customer_nutrition_weekly_plans (
  id uuid primary key default gen_random_uuid(),
  customer_id text not null references public.customers(id) on delete cascade,
  week_start date not null,
  target_calories numeric(8,2),
  goal text not null default 'build',
  body_type text not null default 'mesomorph',
  days jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(customer_id, week_start)
);

alter table public.customer_nutrition_weekly_plans enable row level security;

drop policy if exists "admins can manage weekly nutrition plans" on public.customer_nutrition_weekly_plans;
create policy "admins can manage weekly nutrition plans"
on public.customer_nutrition_weekly_plans for all to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())))
with check (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

grant select, insert, update, delete on public.customer_nutrition_weekly_plans to authenticated;

create or replace function public.player_week_start(p_date date default current_date)
returns date
language sql
immutable
as $$
  -- PostgreSQL date_trunc('week') starts Monday; FITNESS GYM uses Saturday-Friday.
  select (p_date - ((extract(isodow from p_date)::int + 1) % 7))::date;
$$;

-- Creates a simple seven-day starter menu when a player reaches a new week.
-- It is intentionally general and editable by the coach from the admin panel.
create or replace function public.ensure_player_weekly_plan(p_customer_id text, p_week_start date default public.player_week_start(current_date))
returns public.customer_nutrition_weekly_plans
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  result public.customer_nutrition_weekly_plans;
  n record;
  day_names text[] := array['السبت','الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة'];
  generated jsonb := '[]'::jsonb;
  i int;
  kcal numeric := 2000;
  goal_value text := 'build';
  body_value text := 'mesomorph';
  day_obj jsonb;
begin
  select coalesce(target_calories,2000), coalesce(goal,'build'), coalesce(body_type,'mesomorph')
    into kcal, goal_value, body_value
  from public.customer_nutrition_profiles
  where customer_id=p_customer_id
  limit 1;

  select * into result from public.customer_nutrition_weekly_plans
    where customer_id=p_customer_id and week_start=p_week_start limit 1;
  if found then return result; end if;

  for i in 0..6 loop
    day_obj := jsonb_build_object(
      'day', day_names[i+1],
      'date', (p_week_start+i)::date,
      'meals', jsonb_build_array(
        jsonb_build_object('name','الفطور','food','بيض + خبز/شوفان + خضار + فاكهة','calories',round(kcal*0.25)),
        jsonb_build_object('name','سناك','food','زبادي أو لبن + فاكهة أو حفنة مكسرات','calories',round(kcal*0.10)),
        jsonb_build_object('name','الغداء','food','دجاج/لحم/سمك + أرز/بطاطا + سلطة','calories',round(kcal*0.35)),
        jsonb_build_object('name','سناك','food','فاكهة + مصدر بروتين خفيف','calories',round(kcal*0.10)),
        jsonb_build_object('name','العشاء','food','مصدر بروتين + خبز/أرز + خضار','calories',round(kcal*0.20))
      )
    );
    generated := generated || jsonb_build_array(day_obj);
  end loop;

  -- Multiple devices can log in at the same time when a new week starts.
  -- Avoid a unique-key race: only one request creates the plan, the others read it.
  insert into public.customer_nutrition_weekly_plans(customer_id,week_start,target_calories,goal,body_type,days)
  values(p_customer_id,p_week_start,kcal,goal_value,body_value,generated)
  on conflict (customer_id, week_start) do nothing
  returning * into result;

  if not found then
    select * into result
    from public.customer_nutrition_weekly_plans
    where customer_id=p_customer_id and week_start=p_week_start
    limit 1;
  end if;

  return result;
end;
$$;

revoke all on function public.player_week_start(date) from public;
grant execute on function public.player_week_start(date) to anon, authenticated;
revoke all on function public.ensure_player_weekly_plan(text,date) from public;

-- Secure player login gets the current week's menu without exposing the table directly.
-- Replace the existing player_login function with the updated version from supabase-schema.sql
-- if your project already has it. The JS portal also has a safe fallback message if this
-- migration has not yet been applied.
notify pgrst, 'reload schema';

-- Updated player login RPC with current-week plan.
create or replace function public.player_login(p_phone text, p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  c public.customers%rowtype;
  normalized_phone text;
  v_phone_key text;
  pin_value text;
  attempt public.player_login_attempts%rowtype;
begin
  normalized_phone := public.normalize_player_phone(p_phone);
  pin_value := trim(coalesce(p_pin,''));
  v_phone_key := encode(digest(normalized_phone, 'sha256'), 'hex');

  if length(normalized_phone) < 7 or length(normalized_phone) > 15
     or pin_value !~ '^[0-9]{4,12}$' then
    raise exception 'INVALID_PLAYER_LOGIN';
  end if;

  select * into attempt
  from public.player_login_attempts
  where phone_key = v_phone_key;

  if found and attempt.locked_until is not null and attempt.locked_until > now() then
    raise exception 'TOO_MANY_PLAYER_LOGIN_ATTEMPTS';
  end if;

  /*
    Match normalized phone numbers. PINs are accepted in both supported
    formats used by older installations: bcrypt and legacy SHA-256.
    This keeps existing players working while upgrading old hashes.
  */
  select * into c
  from public.customers
  where public.normalize_player_phone(phone) = normalized_phone
    and player_pin_hash is not null
    and (
      player_pin_hash = crypt(pin_value, player_pin_hash)
      or (
        length(player_pin_hash) = 64
        and player_pin_hash = encode(digest(pin_value, 'sha256'), 'hex')
      )
    )
  order by created_at desc
  limit 1;

  if not found then
    if attempt.phone_key is null then
      insert into public.player_login_attempts(phone_key, failed_attempts, first_failed_at, locked_until, updated_at)
      values (v_phone_key, 1, now(), null, now());
    elsif attempt.first_failed_at < now() - interval '15 minutes' then
      update public.player_login_attempts
      set failed_attempts = 1, first_failed_at = now(), locked_until = null, updated_at = now()
      where phone_key = v_phone_key;
    else
      update public.player_login_attempts
      set failed_attempts = failed_attempts + 1,
          locked_until = case when failed_attempts + 1 >= 5 then now() + interval '15 minutes' else null end,
          updated_at = now()
      where phone_key = v_phone_key;
    end if;

    raise exception 'INVALID_PLAYER_LOGIN';
  end if;

  if length(c.player_pin_hash) = 64 then
    update public.customers
    set player_pin_hash = crypt(pin_value, gen_salt('bf', 12)), updated_at = now()
    where id = c.id;
  end if;

  delete from public.player_login_attempts where phone_key = v_phone_key;

  return jsonb_build_object(
    'customer', jsonb_build_object(
      'id', c.id,
      'first_name', c.first_name,
      'second_name', c.second_name,
      'last_name', c.last_name,
      'name', c.name,
      'phone', c.phone,
      'plan', c.plan,
      'start', c.start,
      'end', c."end"
    ),
    'workouts', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'workout_title', w.workout_title,
          'workout_day', w.workout_day,
          'workout_date', w.workout_date,
          'sets_completed', w.sets_completed,
          'reps', w.reps,
          'weight', w.weight,
          'duration', w.duration,
          'notes', w.notes
        ) order by w.workout_date asc, w.created_at asc
      )
      from public.workout_logs w
      where w.customer_id = c.id
    ), '[]'::jsonb),
    'nutrition', (
      select jsonb_build_object(
        'bmr', n.bmr,
        'tdee', n.tdee,
        'target_calories', n.target_calories,
        'protein_g', n.protein_g,
        'carbs_g', n.carbs_g,
        'fats_g', n.fats_g,
        'goal', n.goal
      )
      from public.customer_nutrition_profiles n
      where n.customer_id = c.id
      limit 1
    ),
    'weekly_plan', (
      select to_jsonb(wp)
      from public.ensure_player_weekly_plan(c.id, public.player_week_start(current_date)) wp
    )
  );
end;
$$;


revoke all on function public.player_login(text,text) from public;
grant execute on function public.player_login(text,text) to anon, authenticated;
notify pgrst, 'reload schema';
