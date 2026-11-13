# رفع النظام مجاناً: Render + Neon

**النتيجة:** رابط مثل `https://daily-closing-xxxx.onrender.com` يفتحه الجميع، مع قفل HTTPS 🔒.
**التكلفة:** صفر، **وبدون أي بطاقة بنكية**.
**تحتاج 4 حسابات مجانية:** GitHub ← Neon ← Render ← UptimeRobot. الوقت حوالي 40 دقيقة، مرة واحدة فقط.

| الجزء | دوره |
|---|---|
| **GitHub** | مخزن خاص (Private) لملفات النظام، ولا يراه أحد غيرك |
| **Neon** | قاعدة البيانات PostgreSQL، وفيها كل أرقامك |
| **Render** | يشغّل النظام ويعطيك الرابط |
| **UptimeRobot** | يُبقي الموقع مستيقظاً، وينبهك إذا توقف |

---

## الجزء 1: GitHub (مخزن خاص للنظام)
1. ادخل [github.com](https://github.com) وأنشئ حساباً مجانياً.
   🔐 بعدها من **Settings ← Password and authentication** فعّل **Two-factor authentication**.
2. نزّل برنامج **GitHub Desktop** من [desktop.github.com](https://desktop.github.com) وسجّل دخولك فيه.
3. من البرنامج: **File ← Add local repository** واختر المجلد `C:\shrakh1`.
   - إذا ظهرت عبارة *«This directory does not appear to be a Git repository»* اضغط **create a repository**.
   - **Name:** `daily-closing`، واترك الباقي كما هو، ثم **Create repository**.
4. ✅ **تأكد** أن القائمة على اليسار **لا تحتوي** مجلد `data` ولا `node_modules`. ملف `.gitignore` يمنعهما تلقائياً، حتى لا تُرفع بياناتك أو كلمات المرور.
5. اكتب في خانة Summary كلمة `first version` واضغط **Commit to main**.
6. اضغط **Publish repository**، و**تأكد أن خيار ✅ Keep this code private مفعّل**، ثم **Publish**.

## الجزء 2: Neon (قاعدة البيانات)
1. ادخل [neon.tech](https://neon.tech) واضغط **Sign up**، وسجّل بحساب **GitHub** نفسه.
2. **Create project:**
   - **Project name:** `daily-closing`
   - **Region:** اختر **AWS Europe Central 1 (Frankfurt)**، وهي نفس منطقة Render، فيكون النظام أسرع.
3. من لوحة المشروع اضغط **Connect**:
   - أطفئ خيار **Connection pooling**.
   - انسخ **Connection string**، وهو يبدأ بـ `postgresql://` وينتهي بـ `sslmode=require`.
   🔐 **هذا النص سري جداً**، لأن فيه كلمة مرور قاعدة البيانات. لا ترسله لأحد، ولا تضعه في GitHub.

## الجزء 3: Render (تشغيل النظام)
1. ادخل [render.com](https://render.com) واضغط **Get Started**، وسجّل بحساب **GitHub**.
2. اضغط **New +** ← **Blueprint**.
3. اختر مخزن `daily-closing`. سيطلب منك إعطاء Render صلاحية الوصول؛ اختر **Only select repositories** ثم `daily-closing` فقط.
4. سيقرأ Render ملف الإعداد تلقائياً، ويطلب قيمة **DATABASE_URL**: **الصق نص Neon** الذي نسخته.
5. اضغط **Apply**، وانتظر 3–5 دقائق حتى تظهر الحالة **Live** 🟢.
6. رابطك يظهر أعلى الصفحة، مثل: `https://daily-closing-xxxx.onrender.com`

> **إذا لم يظهر خيار Blueprint**، أو طلب منك بطاقة: اختر **New + ← Web Service** ← المخزن `daily-closing`، واملأ:
> - **Region:** Frankfurt · **Instance Type:** Free
> - **Build Command:** `npm ci --omit=dev` · **Start Command:** `node server.js`
> - **Environment Variables:** أضف أربعة:
>   `DATABASE_URL` = نص Neon · `NODE_ENV` = `production` · `TRUST_PROXY` = `1` · `TZ` = `Asia/Riyadh`

## الجزء 4: أول دخول
1. افتح الرابط، وادخل بـ `admin` / `admin123`.
2. سيُطلب منك **إجبارياً** اختيار كلمة مرور جديدة (8 أحرف على الأقل).
3. أنشئ حساباً **لكل موظف** من «المستخدمون والأنشطة».
4. على الجوال: افتح الرابط، ثم من قائمة المتصفح اختر **«إضافة إلى الشاشة الرئيسية»**.

## الجزء 5: UptimeRobot (يُبقي الموقع مستيقظاً)
الخطة المجانية في Render تجعل الموقع «ينام» إذا لم يُفتح 15 دقيقة، وأول فتح بعدها يتأخر 30–60 ثانية. الحل:
1. ادخل [uptimerobot.com](https://uptimerobot.com) وسجّل مجاناً.
2. **Add New Monitor:**
   - **Monitor Type:** HTTP(s)
   - **URL:** رابطك وفي آخره `/healthz`، مثل: `https://daily-closing-xxxx.onrender.com/healthz`
   - **Monitoring Interval:** 5 minutes
3. **Create Monitor**. ✅ الآن يبقى الموقع سريعاً دائماً، **ويصلك بريد** لو توقف الموقع لأي سبب.

---

## (اختياري) نقل بياناتك الحالية من جهاز المطعم إلى السحابة
افعلها **قبل** البدء بالاستخدام على الإنترنت، لأنها **تستبدل** بيانات السحابة ببيانات جهازك.
افتح PowerShell في `C:\shrakh1`:
```powershell
$env:DATABASE_URL = "الصق نص Neon هنا"
node scripts\import.js data\shrakh.db --replace
```
بعدها ادخل للموقع بنفس اسم المستخدم وكلمة المرور التي على جهازك.

## التحديثات لاحقاً
عندما أعدّل لك النظام: افتح **GitHub Desktop** ← اكتب وصفاً قصيراً ← **Commit to main** ← **Push origin**.
Render يحدّث الموقع تلقائياً خلال دقائق، وبياناتك في Neon لا تتأثر.

## النسخ الاحتياطي
- **Neon** يحتفظ بسجل استرجاع لقاعدة البيانات.
- **أنت:** نزّل نسخة أسبوعياً من زر **«تنزيل نسخة احتياطية»** في صفحة «المستخدمون والأنشطة»، واحفظها على جهازك أو Google Drive.
- لاسترجاع نسخة في أي قاعدة بيانات: `node scripts\import.js النسخة.json --replace`

## الانتقال لاحقاً للمدفوع أو لشركة أخرى
| تريد | الطريقة |
|---|---|
| موقع لا ينام أبداً | في Render: **Upgrade** للخطة Starter (حوالي 7$ شهرياً). ضغطة زر، بدون نقل |
| مساحة أكبر لقاعدة البيانات | في Neon: **Upgrade**. ضغطة زر، والبيانات مكانها |
| سيرفر خاص (أمازون، DigitalOcean…) | اتبع الملف `DEPLOY.md`، ثم انقل البيانات بالنسخة الاحتياطية وأمر `import` |
| قاعدة بيانات أخرى | ضع عنوانها في `DATABASE_URL` ثم انقل البيانات بأمر `import` |

## الأمان
- 🔐 فعّل التحقق بخطوتين في **GitHub** و **Render**. حساب Neon محمي بحساب GitHub.
- 🔐 المخزن **خاص (Private)**، وبياناتك وكلمات المرور **ليست فيه أبداً**.
- 🔐 عنوان قاعدة البيانات محفوظ **فقط** داخل Render كمتغير سري.
- 🔒 الاتصال مشفّر من الجوال إلى Render، ومن Render إلى Neon.
- وكل حماية النظام الداخلية تعمل كما هي: إجبار تغيير كلمة المرور، وحظر التخمين، وتسجيل الدخول مع IP، والحماية من تزوير الطلبات.
