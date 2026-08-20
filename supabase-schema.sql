-- FITNESS GYM / Supabase setup
-- 1) Create an admin user from Supabase Dashboard > Authentication > Users.
-- 2) Copy that user's UUID and insert it into admin_users below.
-- 3) Run this whole file in Supabase SQL Editor.

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'admin',
  created_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  id integer primary key default 1 check (id = 1),
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
  id text primary key,
  name text not null,
  phone text not null,
  plan text not null default 'شهري',
  total numeric(12,2) not null default 0,
  paid numeric(12,2) not null default 0,
  start date,
  "end" date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id text primary key,
  customer_id text not null references public.customers(id) on delete cascade,
  amount numeric(12,2) not null default 0,
  type text not null default 'اشتراك',
  date date not null default current_date,
  note text not null default '',
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
alter table public.site_settings enable row level security;
alter table public.customers enable row level security;
alter table public.invoices enable row level security;

drop policy if exists "admins can view own admin record" on public.admin_users;
create policy "admins can view own admin record"
on public.admin_users for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "public can read site settings" on public.site_settings;
create policy "public can read site settings"
on public.site_settings for select to anon, authenticated
using (true);

drop policy if exists "admins can manage site settings" on public.site_settings;
create policy "admins can manage site settings"
on public.site_settings for all to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())))
with check (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

drop policy if exists "admins can manage customers" on public.customers;
create policy "admins can manage customers"
on public.customers for all to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())))
with check (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

drop policy if exists "admins can manage invoices" on public.invoices;
create policy "admins can manage invoices"
on public.invoices for all to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())))
with check (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

-- Least-privilege grants for the browser Data API.
grant select on public.site_settings to anon, authenticated;
grant select on public.admin_users to authenticated;
grant select, insert, update, delete on public.site_settings to authenticated;
grant select, insert, update, delete on public.customers to authenticated;
grant select, insert, update, delete on public.invoices to authenticated;

-- Default site content. You can edit it later from site-editor.html.
insert into public.site_settings (id, data)
values (1, '{
  "brand":"FITNESS GYM",
  "tag":"FITNESS GYM",
  "heroTitle":"قوّتك تبدأ",
  "heroAccent":"من هنا.",
  "heroText":"تدريب أقوى. جسم أفضل. التزام حقيقي. ابدأ رحلتك معنا اليوم.",
  "stats":[["+500","عضو"],["+50","تمرين"],["7/7","أيام"]],
  "aboutTag":"من نحن",
  "aboutTitle":"مكانك لبناء نسخة أقوى منك",
  "aboutText":"FITNESS GYM هو المكان الذي يجمع التدريب الجاد، المعدات، التحفيز والبيئة المناسبة لتصل إلى أهدافك.",
  "features":["بيئة احترافية","معدات متنوعة","مدربون متخصصون","برامج لجميع المستويات"],
  "services":[{"n":"01","title":"كمال الأجسام","text":"تمارين ومعدات لبناء العضلات والقوة."},{"n":"02","title":"كارديو","text":"رفع اللياقة والتحمل وحرق السعرات."},{"n":"03","title":"تدريب شخصي","text":"برنامج مخصص حسب هدفك ومستواك."},{"n":"04","title":"متابعة غذائية","text":"إرشادات تساعدك على تنظيم نمطك الغذائي."}],
  "plans":[{"title":"شهري","price":"150","period":"/ شهر","features":["دخول النادي","استخدام المعدات","حصص اللياقة"],"hot":false},{"title":"3 أشهر","price":"400","period":"/ 3 أشهر","features":["دخول النادي","جميع المعدات","حصص اللياقة","متابعة تدريبية"],"hot":true},{"title":"سنوي","price":"1200","period":"/ سنة","features":["دخول النادي","جميع المعدات","حصص اللياقة","متابعة تدريبية"],"hot":false}],
  "galleryTitle":"أجواء FITNESS GYM",
  "galleryNote":"يمكن استبدال هذه المساحات بصور النادي الحقيقية لاحقاً.",
  "gallery":["STRENGTH","FOCUS","POWER","DISCIPLINE"],
  "contactTag":"تواصل معنا",
  "contactTitle":"جاهز تبدأ?",
  "contactText":"تواصل معنا للحجز والاستفسار عن الاشتراكات.",
  "phone":"+972 54-670-0672",
  "whatsapp":"+972 54-670-0672",
  "address":"بيت لحم - نحالين - وسط البلد",
  "hours":"السبت – الخميس | 06:00 – 23:00",
  "footer":"القوة • الانضباط • الاستمرارية"
}'::jsonb)
on conflict (id) do nothing;

-- IMPORTANT: after creating the Auth user, run this example with the real UUID/email:
-- insert into public.admin_users(user_id,email) values ('YOUR-AUTH-USER-UUID','admin@fitnessgym.com');


-- Store products
create table if not exists public.products (
  id text primary key default ('PROD-' || replace(gen_random_uuid()::text,'-','')),
  name text not null,
  description text not null default '',
  price numeric(12,2) not null default 0,
  stock integer not null default 0,
  category text not null default '',
  image text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Compatibility / migration for existing databases
-- The existing project may already have `products.id` as UUID.
-- These statements safely add missing fields and ensure new rows get an id.
alter table if exists public.products
  add column if not exists image text;

do $$
declare
  id_type text;
begin
  select data_type into id_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'products'
    and column_name = 'id';

  if id_type = 'uuid' then
    execute 'alter table public.products alter column id set default gen_random_uuid()';
  elsif id_type = 'text' then
    execute 'alter table public.products alter column id set default (''PROD-'' || replace(gen_random_uuid()::text,''-'',''''))';
  end if;
end $$;

-- Optional human-readable product code; it is NOT the database primary key.
alter table if exists public.products
  add column if not exists product_code text;

create unique index if not exists products_product_code_unique
  on public.products(product_code)
  where product_code is not null;

-- Give existing rows a readable code if they do not have one.
update public.products
set product_code = 'PROD-' || upper(substr(replace(gen_random_uuid()::text,'-',''), 1, 10))
where product_code is null;

-- Customer payments
create table if not exists public.payments (
  id text primary key default ('PAY-' || replace(gen_random_uuid()::text,'-','')),
  customer_id text not null references public.customers(id) on delete cascade,
  amount numeric(12,2) not null default 0,
  date date not null default current_date,
  note text not null default '',
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;
alter table public.payments enable row level security;

drop policy if exists "admins can manage products" on public.products;
create policy "admins can manage products"
on public.products for all to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())))
with check (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

drop policy if exists "public can read active products" on public.products;
create policy "public can read active products"
on public.products for select to anon, authenticated
using (active = true);

drop policy if exists "admins can manage payments" on public.payments;
create policy "admins can manage payments"
on public.payments for all to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())))
with check (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

grant select on public.products to anon, authenticated;
grant select, insert, update, delete on public.products to authenticated;
grant select, insert, update, delete on public.payments to authenticated;

-- If the Supabase Auth user for the admin email already exists,
-- this automatically registers it as an admin without requiring the UUID to be copied manually.
insert into public.admin_users(user_id,email,role)
select id,email,'admin' from auth.users
where lower(email)=lower('shakarnah2004@gmail.com')
on conflict (user_id) do update set email=excluded.email, role='admin';



-- Player nutrition profiles (safe separate table for per-player calorie tracking)
create table if not exists public.customer_nutrition_profiles (
  id uuid primary key default gen_random_uuid(),
  customer_id text not null unique references public.customers(id) on delete cascade,
  sex text not null default 'male',
  age integer,
  weight numeric(6,2),
  height numeric(6,2),
  body_type text not null default 'mesomorph',
  goal text not null default 'build',
  activity_level numeric(4,3) not null default 1.55,
  bmr numeric(8,2),
  tdee numeric(8,2),
  target_calories numeric(8,2),
  protein_g numeric(8,2),
  carbs_g numeric(8,2),
  fats_g numeric(8,2),
  updated_at timestamptz not null default now()
);

alter table public.customer_nutrition_profiles enable row level security;
drop policy if exists "staff can manage nutrition profiles" on public.customer_nutrition_profiles;
create policy "staff can manage nutrition profiles"
on public.customer_nutrition_profiles for all to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())))
with check (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));
grant select, insert, update, delete on public.customer_nutrition_profiles to authenticated;

-- Save/update a player's nutrition profile through a protected admin-only RPC.
-- This avoids client-side upsert/RLS edge cases and guarantees the calculated calories
-- are persisted against the selected player.
create or replace function public.save_player_nutrition(
  p_customer_id text,
  p_sex text,
  p_age integer,
  p_weight numeric,
  p_height numeric,
  p_body_type text,
  p_goal text,
  p_activity_level numeric,
  p_bmr numeric,
  p_tdee numeric,
  p_target_calories numeric,
  p_protein_g numeric,
  p_carbs_g numeric,
  p_fats_g numeric
)
returns public.customer_nutrition_profiles
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  result public.customer_nutrition_profiles;
begin
  if not exists (
    select 1 from public.admin_users a
    where a.user_id = (select auth.uid())
  ) then
    raise exception 'غير مصرح: يجب تسجيل الدخول بحساب إدارة النادي';
  end if;

  if not exists (select 1 from public.customers c where c.id = p_customer_id) then
    raise exception 'اللاعب غير موجود';
  end if;

  insert into public.customer_nutrition_profiles (
    customer_id, sex, age, weight, height, body_type, goal, activity_level,
    bmr, tdee, target_calories, protein_g, carbs_g, fats_g, updated_at
  ) values (
    p_customer_id, p_sex, p_age, p_weight, p_height, p_body_type, p_goal, p_activity_level,
    p_bmr, p_tdee, p_target_calories, p_protein_g, p_carbs_g, p_fats_g, now()
  )
  on conflict (customer_id) do update set
    sex = excluded.sex, age = excluded.age, weight = excluded.weight, height = excluded.height,
    body_type = excluded.body_type, goal = excluded.goal, activity_level = excluded.activity_level,
    bmr = excluded.bmr, tdee = excluded.tdee, target_calories = excluded.target_calories,
    protein_g = excluded.protein_g, carbs_g = excluded.carbs_g, fats_g = excluded.fats_g,
    updated_at = now()
  returning * into result;

  return result;
end;
$$;

revoke all on function public.save_player_nutrition(text,text,integer,numeric,numeric,text,text,numeric,numeric,numeric,numeric,numeric,numeric,numeric) from public;
grant execute on function public.save_player_nutrition(text,text,integer,numeric,numeric,text,text,numeric,numeric,numeric,numeric,numeric,numeric,numeric) to authenticated;

-- Player workout tracking
alter table public.customers add column if not exists first_name text;
alter table public.customers add column if not exists second_name text;
alter table public.customers add column if not exists last_name text;

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

-- Workout image storage for admin uploads
insert into storage.buckets (id, name, public)
values ('site-media', 'site-media', true)
on conflict (id) do update set public = true;

drop policy if exists "public can read site media" on storage.objects;
create policy "public can read site media"
on storage.objects for select
using (bucket_id = 'site-media');

drop policy if exists "admins can upload site media" on storage.objects;
create policy "admins can upload site media"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'site-media'
  and exists (select 1 from public.admin_users a where a.user_id = (select auth.uid()))
);

drop policy if exists "admins can update site media" on storage.objects;
create policy "admins can update site media"
on storage.objects for update to authenticated
using (
  bucket_id = 'site-media'
  and exists (select 1 from public.admin_users a where a.user_id = (select auth.uid()))
)
with check (
  bucket_id = 'site-media'
  and exists (select 1 from public.admin_users a where a.user_id = (select auth.uid()))
);

drop policy if exists "admins can delete site media" on storage.objects;
create policy "admins can delete site media"
on storage.objects for delete to authenticated
using (
  bucket_id = 'site-media'
  and exists (select 1 from public.admin_users a where a.user_id = (select auth.uid()))
);


-- Player portal login (phone + PIN) and private dashboard RPC
create extension if not exists pgcrypto;
alter table public.customers add column if not exists player_pin_hash text;

-- Rate-limit failed player logins by normalized phone. This table is intentionally
-- not exposed through the browser Data API; only the SECURITY DEFINER RPC can touch it.
create table if not exists public.player_login_attempts (
  phone_key text primary key,
  failed_attempts integer not null default 0 check (failed_attempts >= 0),
  first_failed_at timestamptz not null default now(),
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.player_login_attempts enable row level security;
revoke all on public.player_login_attempts from public, anon, authenticated;

create index if not exists customers_player_phone_lookup_idx
  on public.customers (phone);
create index if not exists workout_logs_customer_date_idx
  on public.workout_logs (customer_id, workout_date, created_at);
create index if not exists nutrition_customer_idx
  on public.customer_nutrition_profiles (customer_id);

-- Admin-only RPC for setting a player's PIN. The browser never writes player_pin_hash directly.
create or replace function public.set_player_pin(p_customer_id text, p_pin text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.admin_users a where a.user_id = auth.uid()
  ) then
    raise exception 'NOT_AUTHORIZED';
  end if;
  if p_customer_id is null or trim(p_customer_id) = '' or p_pin !~ '^[0-9]{4,12}$' then
    raise exception 'INVALID_PLAYER_PIN';
  end if;
  update public.customers
  set player_pin_hash = crypt(trim(p_pin), gen_salt('bf', 12)),
      updated_at = now()
  where id = p_customer_id;
  if not found then
    raise exception 'CUSTOMER_NOT_FOUND';
  end if;
end;
$$;

revoke all on function public.set_player_pin(text,text) from public;
grant execute on function public.set_player_pin(text,text) to authenticated;

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
  is_valid boolean := false;
begin
  normalized_phone := regexp_replace(coalesce(p_phone,''), '[^0-9]', '', 'g');
  pin_value := trim(coalesce(p_pin,''));
  v_phone_key := encode(digest(normalized_phone, 'sha256'), 'hex');

  -- Reject obviously malformed credentials before touching customer records.
  if length(normalized_phone) < 7 or length(normalized_phone) > 15
     or pin_value !~ '^[0-9]{4,12}$' then
    raise exception 'INVALID_PLAYER_LOGIN';
  end if;

  select * into attempt
  from public.player_login_attempts
  where phone_key = v_phone_key;

  -- Five failed attempts within 15 minutes locks this phone for 15 minutes.
  if found and attempt.locked_until is not null and attempt.locked_until > now() then
    raise exception 'TOO_MANY_PLAYER_LOGIN_ATTEMPTS';
  end if;

  select * into c
  from public.customers
  where regexp_replace(coalesce(phone,''), '[^0-9]', '', 'g') = normalized_phone
    and (
      -- New format: bcrypt via pgcrypto.
      (player_pin_hash like '$2%' and player_pin_hash = crypt(pin_value, player_pin_hash))
      -- Backward compatibility: existing SHA-256 hashes are upgraded after a successful login.
      or (length(player_pin_hash) = 64 and player_pin_hash = encode(digest(pin_value, 'sha256'), 'hex'))
    )
  order by created_at desc
  limit 1;

  if not found then
    if attempt.phone_key is null then
      insert into public.player_login_attempts(phone_key, failed_attempts, first_failed_at, locked_until, updated_at)
      values (v_phone_key, 1, now(), null, now());
    elsif attempt.first_failed_at < now() - interval '15 minutes' then
      update public.player_login_attempts
      set failed_attempts = 1,
          first_failed_at = now(),
          locked_until = null,
          updated_at = now()
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

  -- Upgrade legacy SHA-256 PINs to salted bcrypt on the first successful login.
  if length(c.player_pin_hash) = 64 then
    update public.customers
    set player_pin_hash = crypt(pin_value, gen_salt('bf', 12)),
        updated_at = now()
    where id = c.id;
    c.player_pin_hash := null;
  end if;

  delete from public.player_login_attempts where phone_key = v_phone_key;

  -- Return only the fields the player portal actually needs.
  return jsonb_build_object(
    'customer', jsonb_build_object(
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
    )
  );
end;
$$;

revoke all on function public.player_login(text,text) from public;
grant execute on function public.player_login(text,text) to anon, authenticated;

-- Refresh PostgREST schema cache after this migration.
notify pgrst, 'reload schema';
