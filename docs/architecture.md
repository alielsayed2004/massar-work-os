# المعمارية التقنية لـ Massar Work OS (V1)

## 1. الهيكل العام (Tech Stack)
النظام مبني كـ **Monolith Architecture** لضمان سرعة التطوير والتكامل:
- **إطار العمل (Framework):** Next.js (App Router) مع TypeScript.
- **الواجهات (Frontend):** React Server Components (RSC) و Client Components.
- **التنسيق (Styling):** Vanilla CSS مدعوم بملف `massar-design-tokens.css` لضمان هوية مسار.
- **قاعدة البيانات والتخزين (Backend/Database/Storage):** Supabase (PostgreSQL).
- **المصادقة (Auth):** Supabase Auth.
- **إدارة التوقيت:** مكتبة `date-fns-tz` للتعامل مع توقيت `Africa/Cairo` وتجنب مشاكل التوقيت الصيفي.

## 2. معمارية الأمان والصلاحيات (Authorization Architecture)
لا يعتمد النظام على إخفاء أزرار الواجهة (UI-Hiding) فقط، بل يعتمد على **تأمين البيانات من المصدر (Server-Side & DB Level)**:
- **Row Level Security (RLS):** كل جدول في Supabase يمتلك سياسات صريحة بناءً على دور المستخدم (`admin`, `team_manager`, `team_member`, `client`).
- **Server Actions Validation:** جميع أوامر تعديل البيانات (إنشاء مهمة، نقل مسؤولية، مراجعة) في مجلد `actions/` تتحقق من هوية المستخدم ودوره قبل التنفيذ.
- **عزل الملفات والتنزيل (File Security):** لا توجد روابط عامة (Public URLs). الملفات في `Private Bucket`. يمر طلب التنزيل عبر `/api/files/download` الذي يفحص استحقاق المستخدم (خصوصاً العميل) قبل إصدار `Signed URL` بمدة 60 ثانية.

## 3. التعامل مع البيانات المعقدة (Concurrency & Transactions)
لضمان عدم تضارب البيانات في حالات مثل (طلب النقل المزدوج، أو اعتماد مزدوج للنسخ):
- استخدام **دوال RPC (Remote Procedure Calls):**
  - `process_handover_decision`
  - `process_review_decision`
- هذه الدوال تستخدم **قفل الصفوف (Row Level Locks - FOR UPDATE)** لإنجاز العملية (تحديث الحالة، وتسجيل النشاط، وإرسال الإشعار) كـ Transaction واحدة غير قابلة للتجزئة.

## 4. الفهارس الفريدة وتكامل البيانات
- **XOR Constraints:** لضمان تبعية المرفقات والتعليقات إما لمهمة (Task) أو لنسخة تسليم (Deliverable Version) ولكن ليس كليهما.
- **Partial Unique Indexes:** لمنع المستخدم من تقديم أكثر من طلب نقل `handover` مفتوح لنفس المهمة في ذات الوقت (`WHERE status = 'pending'`).
