# Massar Work OS — V1

نظام تشغيل داخلي لمسار + بوابة عملاء. Next.js 16 (App Router) + Supabase (Postgres + Auth + Storage).

## التشغيل

### 1. متغيرات البيئة — `.env.local`
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```
`SUPABASE_SERVICE_ROLE_KEY` **إجباري**: من غيره دعوة المستخدمين وتحميل الملفات لا يعملان.
تجده في Supabase → Project Settings → API Keys → *secret* / *service_role*.
لا تضع قبله `NEXT_PUBLIC_` أبدًا، ولا ترفعه على Git.

### 2. قاعدة البيانات
- **قاعدة بيانات شغّلت عليها 001–009 قبل كده** → شغّل في SQL Editor ملف واحد بس:
  `supabase/migrations/20261020000010_review_links_and_team_whatsapp.sql`
- **قاعدة بيانات جديدة فاضية** → شغّل `init.sql` (فيه 001→010 بالترتيب) أو `supabase db push`.
- لا تشغّل `init.sql` على قاعدة فيها الجداول بالفعل؛ هيطلع `already exists`.

### 3. بيانات تجريبية (اختياري — محلي/Staging فقط)
أنشئ 4 مستخدمين من Authentication → Users:
`admin@massar.test`, `manager@massar.test`, `member@massar.test`, `client@massar.test`
ثم شغّل `supabase/seed.sql`. الملف يوزّع الأدوار حسب البريد وآمن لإعادة التشغيل.

**أول Admin في مشروع حقيقي:** سجّل المستخدم من Authentication ثم شغّل في SQL Editor:
```sql
update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'you@company.com');
```

### 4. التشغيل
```bash
npm install
npm run dev
```

## قواعد الأمان (مطبّقة داخل قاعدة البيانات، مش في الواجهة بس)
| القاعدة (من ملحق القرارات) | أين تُطبّق |
|---|---|
| المستخدم لا يغيّر دوره بنفسه؛ الدور من `app_metadata` فقط | RLS على `profiles` + `handle_new_user` |
| الموظف لا يغيّر المسؤول؛ يطلب نقل والمدير يقرر | `request_handover` / `process_handover_decision` |
| طلب نقل واحد مفتوح لكل مهمة | Unique index + قفل الصف |
| حالة المهمة تتغيّر بقواعد ثابتة | `update_task_status` |
| لا مشاركة مع العميل قبل الاعتماد الداخلي | `share_version_with_client` |
| المراجع المعيّن فقط يعتمد داخليًا، ولا يعتمد نسخته | `process_review_decision` |
| نسخة جديدة لا ترث موافقة قديمة؛ النسخة تتجمّد بعد الإرسال | `create_deliverable_version` + RLS على `files` |
| العميل يرى ما شُورك مع جهته فقط | RLS + `is_client_member` |
| الموظف يرى مهام فريقه فقط | RLS على `tasks` / `files` / `comments` |
| التنزيل برابط 60 ثانية بعد فحص الصلاحية كالمستخدم نفسه | `/api/files/download` |
| كل المواعيد تُدخل وتُعرض بتوقيت `Africa/Cairo` وتُخزن UTC | `src/lib/labels.ts` |

أي تغيير في حالة أو ملكية = دالة في قاعدة البيانات. لا تضيف `update` مباشر على
`tasks.status` أو `deliverable_versions.status` من الواجهة؛ الـ RLS هيرفضه.

## ناقص في V1 (مقصود)
- رفع ملفات العمل على المهمة نفسها (الرفع متاح على نسخ التسليم فقط).
- إشعارات بريد/موبايل — الإشعارات داخل التطبيق فقط.
- Rate limiting على مستوى التطبيق.
