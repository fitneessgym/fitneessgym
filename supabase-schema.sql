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
