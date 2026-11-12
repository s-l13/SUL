# دليل رفع النظام على سيرفر خاص (VPS: أمازون Lightsail، DigitalOcean…)

> 💡 **للرفع المجاني بدون بطاقة** استخدم الدليل `DEPLOY-RENDER.md` (Render + Neon). هذا الدليل للسيرفر الخاص المدفوع.

**النتيجة:** رابط مثل `https://barakaji.duckdns.org` يفتحه الجميع من أي جهاز، مع قفل HTTPS 🔒.
**التكلفة:** حوالي 7$ شهرياً، و**أول 3 أشهر مجاناً** على باقات 5$ و 7$ و 12$. والرابط وشهادة HTTPS مجانيان.
**الوقت:** حوالي 45 دقيقة، مرة واحدة فقط.

> يعمل هذا الدليل على أي سيرفر Ubuntu آخر (DigitalOcean، Hetzner…). تختلف فقط الخطوات 1 إلى 3.

---

## الخطوة 1: حساب أمازون (AWS)
1. ادخل [aws.amazon.com](https://aws.amazon.com) واضغط **Create an AWS Account**.
2. أدخل البريد الإلكتروني واسماً للحساب، ثم كود التحقق الذي يصلك على البريد، ثم كلمة مرور قوية.
3. **نوع الخطة:** إذا سألك **Free plan** أو **Paid plan**، اختر **Paid plan**.
   الخطة المجانية تُغلق الحساب تلقائياً بعد 6 أشهر، والسيرفر يحتاج أن يبقى يعمل. والرصيد الترحيبي (100$) تحصل عليه في الخطتين.
4. **Contact information:** اختر **Personal**، وأدخل الاسم والعنوان بالإنجليزي.
5. **البطاقة:** بطاقة **ائتمانية (Credit)** من البنك هي الأضمن. يُحجز حوالي 1$ للتحقق ثم يعود.
6. **التحقق من الجوال:** رسالة SMS أو اتصال آلي فيه كود.
7. **Support plan:** اختر **Basic support – Free**.
8. 🔐 **مهم للأمان:** بعد الدخول، اضغط اسم الحساب أعلى اليمين ← **Security credentials** ← **Assign MFA device**، وفعّل التحقق بخطوتين بتطبيق Google Authenticator أو Microsoft Authenticator.
9. 💰 **تنبيه الميزانية:** ابحث في أعلى الصفحة عن **Budgets** ← **Create budget** ← **Monthly cost budget** بمبلغ **10$**، واكتب بريدك. لو تجاوزت التكلفة ذلك تصلك رسالة.

## الخطوة 2: إنشاء السيرفر في Lightsail
1. ادخل [lightsail.aws.amazon.com](https://lightsail.aws.amazon.com) واضغط **Create instance**.
2. **Instance location:** اضغط **Change AWS Region** واختر **Frankfurt (eu-central-1)**.
   أقرب مناطق Lightsail للسعودية فرانكفورت أو مومباي، وكلاهما سريع لهذا النظام.
3. **Platform:** Linux/Unix ← **Blueprint:** اضغط **OS Only** ← **Ubuntu 22.04 LTS** (أو 24.04).
4. **SSH key pair:** اترك المفتاح الافتراضي، واضغط **Download** لتنزيل ملف المفتاح (`LightsailDefaultKey-eu-central-1.pem`).
   🔐 احفظه في `C:\keys\`. **من يملكه يدخل السيرفر**، فلا ترسله لأحد، واحفظ منه نسخة على فلاشة.
5. **Instance plan:** اختر باقة **IPv4** (وليس IPv6-only). يُفضّل **7$ (1 GB)**، وتكفي **5$** أيضاً. الباقتان مجانيتان أول 3 أشهر.
6. **Name:** `daily-closing` ثم **Create instance**، وانتظر حتى تصير الحالة **Running**.

## الخطوة 3: عنوان ثابت وفتح المنافذ
1. **عنوان ثابت (مهم):** من القائمة **Networking** ← **Create static IP**، واربطه بالسيرفر `daily-closing`.
   بدونه يتغير عنوان السيرفر إذا أُعيد تشغيله فيتعطل الرابط. والعنوان الثابت مجاني ما دام مرتبطاً بالسيرفر.
2. **انسخ العنوان الثابت** (Static IP) واحفظه.
3. **المنافذ:** افتح السيرفر ← تبويب **Networking** ← **IPv4 Firewall** ← **Add rule** ← اختر **HTTPS** (443) ← **Create**.
   تأكد أن القائمة فيها فقط: **SSH (22)** و **HTTP (80)** و **HTTPS (443)**.

## الخطوة 4: الرابط المجاني (DuckDNS)
1. ادخل [duckdns.org](https://www.duckdns.org) وسجّل بحساب Google.
2. اكتب اسماً للرابط، مثل `barakaji`، واضغط **add domain**.
3. في خانة **current ip** الصق **العنوان الثابت (Static IP)** الخاص بالسيرفر، ثم اضغط **update ip**.
   صار رابطك: `barakaji.duckdns.org`

## الخطوة 5: تجهيز الحزمة على جهازك
افتح PowerShell في مجلد النظام:
```powershell
cd C:\shrakh1
powershell -ExecutionPolicy Bypass -File deploy\pack.ps1
```
سيُنشأ ملف `daily-closing.tar.gz`.
> لنقل بياناتك الحالية معك استخدم: `deploy\pack.ps1 -WithData`
> (إذا أردت البدء من الصفر بالأرقام الصحيحة، صفِّر الأرقام التجريبية أولاً أو ارفع بدون `-WithData`).

## الخطوة 6: رفع الحزمة إلى السيرفر
في PowerShell (غيّر مسار المفتاح والـ IP):
```powershell
# مرة واحدة: حماية ملف المفتاح (Windows يرفض المفتاح بدونها)
icacls C:\keys\LightsailDefaultKey-eu-central-1.pem /inheritance:r /grant:r "$($env:USERNAME):R"

scp -i C:\keys\LightsailDefaultKey-eu-central-1.pem C:\shrakh1\daily-closing.tar.gz ubuntu@IP_السيرفر:~
```

## الخطوة 7: التثبيت (أمر واحد)
```powershell
ssh -i C:\keys\LightsailDefaultKey-eu-central-1.pem ubuntu@IP_السيرفر
```
ثم داخل السيرفر:
```bash
mkdir -p ~/app && tar -xzf daily-closing.tar.gz -C ~/app && cd ~/app
sudo bash deploy/setup.sh barakaji.duckdns.org
```
ينتظر حوالي 5 دقائق، وفي النهاية يظهر: **DONE ✔ Open: https://barakaji.duckdns.org**

## الخطوة 8: أول دخول
1. افتح الرابط وادخل بـ `admin` / `admin123`.
2. سيطلب منك النظام **إجبارياً** اختيار كلمة مرور جديدة (8 أحرف على الأقل).
3. أنشئ حساباً **مستقلاً لكل موظف** من «المستخدمون والأنشطة»، ولا تشارك حساب المدير مع أحد.
4. على الجوال: افتح الرابط ثم من قائمة المتصفح اختر **«إضافة إلى الشاشة الرئيسية»** ليصبح كأنه تطبيق.

---

## الحماية المطبّقة

| على مستوى النظام | على مستوى السيرفر |
|---|---|
| اتصال مشفّر HTTPS إجباري مع HSTS | جدار حماية: يفتح فقط 22 و 80 و 443 |
| كوكيز الدخول: HttpOnly + Secure + SameSite | دخول السيرفر بالمفتاح فقط، بلا كلمة مرور، وبلا root |
| حماية من تزوير الطلبات (CSRF) | fail2ban يحظر من يخمّن كلمات مرور SSH |
| حظر تخمين كلمات المرور (لكل مستخدم ولكل IP) | تحديثات أمنية تلقائية يومية |
| إجبار تغيير كلمة المرور الافتراضية | النظام يعمل بمستخدم خاص بصلاحيات محدودة (ليس root) |
| كلمات مرور 8 أحرف على الأقل | النظام لا يُرى مباشرة من الإنترنت، فقط عبر Caddy |
| تغيير كلمة المرور يُخرج كل الأجهزة الأخرى | البيانات في مجلد لا يقرؤه إلا النظام |
| رؤوس أمان (CSP و X-Frame-Options وغيرها) | نسخة احتياطية تلقائية يومية (آخر 30 يوماً) |
| تسجيل كل دخول، وكل محاولة فاشلة مع IP | |

### مسؤوليتك أنت
- 🔐 **ملف مفتاح SSH:** لا ترسله لأحد. إذا فقدته لا تستطيع دخول السيرفر، وإذا تسرّب يجب استبداله.
- 🔐 **حساب أمازون:** فعّل التحقق بخطوتين، ولا تشارك بيانات الدخول.
- 👀 **راجع «سجل العمليات»** من وقت لآخر، وانتبه لأي «محاولة دخول فاشلة» متكررة.
- 💾 **نزّل نسخة احتياطية أسبوعياً** من زر «تنزيل نسخة احتياطية» في صفحة المستخدمين، واحفظها خارج السيرفر (جهازك أو Google Drive).

---

## التحديثات لاحقاً
على جهازك أعد الخطوتين 5 و 6، ثم:
```bash
ssh -i C:\keys\LightsailDefaultKey-eu-central-1.pem ubuntu@IP_السيرفر
rm -rf ~/app && mkdir -p ~/app && tar -xzf daily-closing.tar.gz -C ~/app && cd ~/app
sudo bash deploy/update.sh
```
السكربت يأخذ نسخة من البيانات قبل التحديث تلقائياً، ولا يلمس البيانات أبداً.

## استرجاع نسخة احتياطية (عند الحاجة فقط)
```bash
sudo systemctl stop daily-closing
sudo cp /var/lib/daily-closing/backups/daily-2026-11-20.db /var/lib/daily-closing/shrakh.db
sudo rm -f /var/lib/daily-closing/shrakh.db-wal /var/lib/daily-closing/shrakh.db-shm
sudo chown dailyclose:dailyclose /var/lib/daily-closing/shrakh.db
sudo systemctl start daily-closing
```

## إذا لم يفتح الموقع
| المشكلة | الحل |
|---|---|
| الصفحة لا تفتح أبداً | تأكد من الخطوة 3 (منفذ 443 في Lightsail)، ومن أن IP في DuckDNS هو العنوان الثابت |
| خطأ في الشهادة | انتظر دقيقتين بعد التثبيت، ثم: `sudo journalctl -u caddy -n 50` |
| «Bad gateway» | `sudo systemctl status daily-closing` و `sudo journalctl -u daily-closing -n 50` |

## لاحقاً: دومين خاص
عند شراء دومين (مثل `barakaji.com`، بحوالي 40 ريالاً في السنة): وجّه سجل **A** إلى IP السيرفر، ثم أعد تشغيل:
`sudo bash deploy/setup.sh barakaji.com`
