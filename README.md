# FITNESS GYM — Supabase Edition

تم ربط الموقع بقاعدة بيانات Supabase بدلاً من localStorage.

## 1. إنشاء مشروع Supabase
1. أنشئ مشروعاً جديداً في Supabase.
2. من Authentication > Users أنشئ حساب المدير بالبريد وكلمة المرور التي تريدها.
3. افتح SQL Editor وشغّل ملف `supabase-schema.sql` بالكامل.
4. انسخ UUID للمستخدم الذي أنشأته، ثم نفّذ السطر الموجود في نهاية SQL لإضافته إلى `admin_users`.
5. افتح `supabase-config.js` وضع:
   - `SUPABASE_URL` = رابط المشروع.
   - `SUPABASE_ANON_KEY` أو publishable key = مفتاح المتصفح للمشروع.

## 2. الحماية
- الدخول يتم عبر Supabase Auth بالبريد وكلمة المرور.
- لا يتم السماح بالدخول للوحة الإدارة إلا إذا كان المستخدم موجوداً في `admin_users`.
- العملاء والفواتير وإعدادات الموقع محمية بـ Row Level Security.
- الموقع العام يستطيع قراءة إعدادات الموقع فقط.
- لا تضع أبداً `service_role` key داخل ملفات الموقع.

## 3. الصفحات
- `index.html` الموقع العام، ويقرأ المحتوى من Supabase.
- `admin-login.html` تسجيل دخول المدير.
- `admin.html` العملاء والديون والفواتير.
- `site-editor.html` التحكم الكامل بمحتوى الموقع.

## 4. نشر GitHub Pages
ارفع جميع الملفات إلى مستودع GitHub كما هي، بعد تعبئة `supabase-config.js`.

## 5. ملاحظة
لا أستطيع إنشاء مشروع Supabase أو وضع مفاتيح حسابك من داخل هذه المحادثة بدون بيانات/وصول إلى مشروعك. النسخة هنا مجهزة بالكامل للاتصال بمجرد وضع URL والمفتاح وتشغيل SQL.


## WhatsApp
- Products now have a "شراء عبر واتساب" button.
- Admin customer list has a WhatsApp message button.
- Admin invoices have a WhatsApp send button that sends a formatted invoice to the customer's phone.
