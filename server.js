const express = require('express');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');
const os = require('os');
const fs = require('fs');
const db = require('./db');
const { seedBusinessDefaults, exportAll, dataDir } = db;

// ── configuration (environment variables; all optional) ──
//   PORT=3000  HOST=0.0.0.0  TRUST_PROXY=1 (behind a HTTPS proxy)  NODE_ENV=production
//   DATABASE_URL=postgres://…  → PostgreSQL;   otherwise SQLite in DATA_DIR (default ./data)
const PROD = process.env.NODE_ENV === 'production';
const app = express();
app.disable('x-powered-by');
if (process.env.TRUST_PROXY) app.set('trust proxy', 1); // so req.secure / req.ip are right behind the HTTPS proxy

// security headers on every response
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'", "script-src 'self' 'unsafe-inline'", "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com", "img-src 'self' data: blob:", "connect-src 'self'", "frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'",
  ].join('; '));
  if (req.secure) res.setHeader('Strict-Transport-Security', 'max-age=15552000');
  next();
});
app.get('/healthz', (req, res) => res.json({ ok: true }));
// CSRF protection: every state-changing API call must carry a custom header. Browsers never let
// another website add custom headers to a cross-site request, so forged requests are rejected.
app.use('/api', (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || req.get('x-requested-with') === 'fetch') return next();
  jerr(req, res, 403, 'طلب غير مسموح');
});
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
// no-cache: browsers re-check the files on each load, so updates show up immediately
app.use(express.static(path.join(__dirname, 'public'), { setHeaders: (res) => res.setHeader('Cache-Control', 'no-cache') }));

// ───────────────────────── helpers ─────────────────────────
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : NaN; };
// ids coming from the URL / forms: a positive integer or 0 (never reaches SQL as free text)
const idOf = (v) => { const n = Number(v); return Number.isInteger(n) && n > 0 ? n : 0; };
const today = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const addDays = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const nowLocal = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 19).replace('T', ' '); };
// restaurant work day: closing after midnight still belongs to the previous day
const workDate = (b) => { const d = new Date(Date.now() - (b.day_start_hour || 0) * 3600e3); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const MAX_DATE = '9999-12-31';

class HttpError extends Error { constructor(status, msg, vars) { super(msg); this.status = status; this.vars = vars; } }
const bad = (msg, vars) => { throw new HttpError(400, msg, vars); };

// ── language: client sends X-Lang: en|ar; Arabic text is the key into the English dictionary ──
const EN = require('./public/i18n.js');
const langOf = (req) => (req.get('x-lang') === 'en' ? 'en' : 'ar');
const tr = (lang, msg, vars) => {
  let out = lang === 'en' && EN[msg] !== undefined ? EN[msg] : msg;
  if (vars) out = out.replace(/\{(\w+)\}/g, (m, k) => vars[k] instanceof HttpError ? tr(lang, vars[k].message, vars[k].vars) : (vars[k] ?? m));
  return out;
};
const trMap = (lang, obj) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, tr(lang, v)]));
const jerr = (req, res, status, msg) => res.status(status).json({ error: tr(langOf(req), msg) });
const wrap = (fn) => (req, res, next) => {
  try {
    const out = fn(req, res);
    if (out && typeof out.then === 'function') out.then(v => { if (v !== undefined) res.json(v); }, next);
    else if (out !== undefined) res.json(out);
  } catch (e) { next(e); }
};

const PERMISSIONS = {
  purchases_add: 'تسجيل فواتير المشتريات',
  shift_manage: 'إقفال يوم العمل (تسجيل المبيعات)',
  shift_view_expected: 'رؤية النقد المتوقع ونتيجة الجرد',
  tx_view_all: 'عرض كل الحركات',
  tx_edit: 'تعديل وحذف الحركات',
  shift_reopen: 'تعديل الإقفالات واستلام النقد',
  finance_manage: 'العمليات المالية (تحصيل التطبيقات، الديون، التسويات، المسحوبات)',
  reports_view: 'عرض التقارير',
  balance_view: 'عرض رصيد الشركة والديون',
  audit_view: 'عرض سجل التعديلات',
  settings_manage: 'إعدادات النشاط (التطبيقات، التصنيفات، الدائنين)',
};
const ALL_PERMS = Object.keys(PERMISSIONS);

const TX_TYPES = {
  purchase: 'مشتريات', expense: 'مصروف', debt_payment: 'سداد دين', loan: 'تمويل / دين جديد',
  owner_deposit: 'إيداع من المالك', withdrawal: 'مسحوبات المالك', app_settlement: 'تحصيل من تطبيق توصيل', adjustment: 'تسوية رصيد',
  debt_writeoff: 'إسقاط / تخفيض دين',
};
const METHODS = { drawer: 'كاش من الدرج', company: 'من حساب الشركة', credit: 'آجل (على الدين)' };

// effect of a transaction on the company balance
function balanceEffect(t) {
  switch (t.type) {
    case 'purchase': case 'expense': return t.payment_method === 'credit' ? 0 : -t.amount;
    case 'debt_payment': case 'withdrawal': return -t.amount;
    case 'loan': case 'owner_deposit': case 'adjustment': return t.amount;
    case 'app_settlement': return -t.fee;
    default: return 0;
  }
}
// effect on the cash drawer (for shift reconciliation)
function drawerEffect(t) {
  if (t.payment_method !== 'drawer') return 0;
  if (['purchase', 'expense', 'debt_payment', 'withdrawal'].includes(t.type)) return -t.amount;
  if (['loan', 'owner_deposit'].includes(t.type)) return t.amount;
  return 0;
}

const audit = (bid, uid, action, details) => db.run('INSERT INTO audit_log (business_id, user_id, action, details) VALUES (?,?,?,?)',
  bid || null, uid || null, action, details ? JSON.stringify(details) : null);

// ───────────────────────── auth ─────────────────────────
const SESSION_DAYS = 30;
// brute-force protection: per username (5 fails / 5 min) and per IP address (20 fails / 15 min)
const loginAttempts = new Map(), ipAttempts = new Map();
const tooMany = (map, key, max, win) => { const a = map.get(key); return a && a.n >= max && Date.now() - a.t < win; };
const fail = (map, key, win) => { const a = map.get(key); map.set(key, a && Date.now() - a.t < win ? { n: a.n + 1, t: Date.now() } : { n: 1, t: Date.now() }); };
const DEFAULT_PASSWORD = 'admin123';
const PW_MIN = PROD ? 8 : 6; // stricter on the internet-facing server

app.post('/api/login', wrap(async (req, res) => {
  const { username, password } = req.body || {};
  const key = String(username || '').toLowerCase(), ip = req.ip;
  if (tooMany(loginAttempts, key, 5, 5 * 60e3) || tooMany(ipAttempts, ip, 20, 15 * 60e3)) throw new HttpError(429, 'محاولات كثيرة، حاول بعد 5 دقائق');
  const u = await db.get('SELECT * FROM users WHERE lower(username) = lower(?)', String(username || ''));
  if (!u || !u.active || !bcrypt.compareSync(String(password || ''), u.password_hash)) {
    fail(loginAttempts, key, 5 * 60e3); fail(ipAttempts, ip, 15 * 60e3);
    await audit(null, u ? u.id : null, 'login_failed', { username: String(username || '').slice(0, 60), ip });
    throw new HttpError(401, 'اسم المستخدم أو كلمة المرور غير صحيحة');
  }
  loginAttempts.delete(key);
  // still using the factory password → must change it before doing anything else
  if (String(password) === DEFAULT_PASSWORD) await db.run('UPDATE users SET must_change = 1 WHERE id = ?', u.id);
  const token = crypto.randomBytes(32).toString('hex');
  await db.run('INSERT INTO sessions (token, user_id, expires_at) VALUES (?,?,?)', token, u.id, Date.now() + SESSION_DAYS * 864e5);
  await db.run('DELETE FROM sessions WHERE expires_at < ?', Date.now());
  // `secure` when served over HTTPS (behind the proxy) so the cookie never travels unencrypted
  res.cookie('sid', token, { httpOnly: true, sameSite: 'lax', secure: req.secure, maxAge: SESSION_DAYS * 864e5 });
  await audit(null, u.id, 'login', { ip });
  return { ok: true };
}));

app.post('/api/logout', wrap(async (req, res) => {
  if (req.cookies.sid) await db.run('DELETE FROM sessions WHERE token = ?', String(req.cookies.sid));
  res.clearCookie('sid');
  return { ok: true };
}));

async function auth(req, res, next) {
  const s = req.cookies.sid && await db.get('SELECT * FROM sessions WHERE token = ? AND expires_at > ?', String(req.cookies.sid), Date.now());
  const u = s && await db.get('SELECT id, username, name, is_admin, active, must_change FROM users WHERE id = ?', s.user_id);
  if (!u || !u.active) return jerr(req, res, 401, 'يجب تسجيل الدخول');
  req.user = u;
  // until the default password is changed, only "who am I", change password and logout work
  if (u.must_change && !['/me', '/me/password', '/logout'].includes(req.path)) return jerr(req, res, 403, 'غيّر كلمة المرور الافتراضية أولاً');
  next();
}
const adminOnly = (req, res, next) => req.user.is_admin ? next() : jerr(req, res, 403, 'هذه الصفحة للمدير فقط');

async function userBusinesses(u) {
  if (u.is_admin) return (await db.all('SELECT id, name, active, logo_updated logo_v FROM businesses WHERE active = 1 ORDER BY id')).map(b => ({ ...b, permissions: ALL_PERMS }));
  return (await db.all(`SELECT b.id, b.name, b.active, b.logo_updated logo_v, ub.permissions FROM user_business ub JOIN businesses b ON b.id = ub.business_id
                        WHERE ub.user_id = ? AND b.active = 1 ORDER BY b.id`, u.id)).map(b => ({ ...b, permissions: JSON.parse(b.permissions) }));
}

app.use('/api', auth);

app.get('/api/me', wrap(async (req) => ({
  user: req.user, businesses: await userBusinesses(req.user), today: today(),
  permissions: trMap(langOf(req), PERMISSIONS), txTypes: trMap(langOf(req), TX_TYPES), methods: trMap(langOf(req), METHODS),
})));

app.post('/api/me/password', wrap(async (req) => {
  const { current, password } = req.body || {};
  const u = await db.get('SELECT * FROM users WHERE id = ?', req.user.id);
  if (!bcrypt.compareSync(String(current || ''), u.password_hash)) bad('كلمة المرور الحالية غير صحيحة');
  if (!password || String(password).length < PW_MIN) bad('كلمة المرور الجديدة يجب أن تكون {n} أحرف على الأقل', { n: PW_MIN });
  if (String(password) === DEFAULT_PASSWORD) bad('اختر كلمة مرور غير الافتراضية');
  await db.run('UPDATE users SET password_hash = ?, must_change = 0 WHERE id = ?', bcrypt.hashSync(String(password), 10), u.id);
  // sign out every other device that was logged in with the old password
  await db.run('DELETE FROM sessions WHERE user_id = ? AND token != ?', u.id, String(req.cookies.sid));
  await audit(null, u.id, 'password_change', { ip: req.ip });
  return { ok: true };
}));

// ───────────────────────── backups ─────────────────────────
// SQLite: a file copy.  PostgreSQL: a JSON snapshot stored in the database (the provider also keeps its own backups).
const BACKUP_DIR = path.join(dataDir, 'backups');
async function makeBackup(label) {
  if (db.dialect === 'sqlite') {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const file = path.join(BACKUP_DIR, `${label}-${nowLocal().replace(/[: ]/g, '-')}.db`);
    await db.backupFile(file);
    return path.relative(__dirname, file);
  }
  const id = await db.insert('INSERT INTO snapshots (label, data) VALUES (?,?)', label, JSON.stringify(await exportAll()));
  await db.run('DELETE FROM snapshots WHERE id NOT IN (SELECT id FROM snapshots ORDER BY id DESC LIMIT 10)');
  return `snapshot #${id}`;
}

// ───────────────────────── admin ─────────────────────────
const admin = express.Router();
admin.use(adminOnly);

admin.get('/businesses', wrap(() => db.all('SELECT id, name, card_fee_pct, cash_float, opening_balance, active, created_at, cashier_counts, day_start_hour, logo_updated logo_v FROM businesses ORDER BY id')));
admin.post('/businesses', wrap(async (req) => {
  const { name, card_fee_pct = 0, cash_float = 0, opening_balance = 0 } = req.body || {};
  if (!name || !String(name).trim()) bad('اسم النشاط مطلوب');
  const id = await db.tx(async () => {
    const bid = await db.insert('INSERT INTO businesses (name, card_fee_pct, cash_float, opening_balance) VALUES (?,?,?,?)',
      String(name).trim(), num(card_fee_pct) || 0, num(cash_float) || 0, num(opening_balance) || 0);
    await seedBusinessDefaults(bid);
    return bid;
  });
  await audit(id, req.user.id, 'business_create', { name });
  return { id };
}));
admin.put('/businesses/:id', wrap(async (req) => {
  const b = await db.get('SELECT * FROM businesses WHERE id = ?', idOf(req.params.id));
  if (!b) throw new HttpError(404, 'غير موجود');
  const x = { ...b, ...req.body };
  await db.run('UPDATE businesses SET name=?, card_fee_pct=?, cash_float=?, opening_balance=?, active=? WHERE id=?',
    String(x.name).trim(), num(x.card_fee_pct) || 0, num(x.cash_float) || 0, num(x.opening_balance) || 0, x.active ? 1 : 0, b.id);
  await audit(b.id, req.user.id, 'business_update', req.body);
  return { ok: true };
}));

// wipe a business's trial data so real numbers can start from zero — a full backup is taken first
admin.post('/businesses/:id/reset', wrap(async (req) => {
  const b = await db.get('SELECT * FROM businesses WHERE id = ?', idOf(req.params.id));
  if (!b) throw new HttpError(404, 'غير موجود');
  const x = req.body || {};
  if (String(x.confirm || '').trim() !== b.name.trim()) bad('اكتب اسم النشاط كما هو للتأكيد');
  const backup = await makeBackup(`before-reset-${b.id}`);
  const counts = await db.tx(async () => {
    const c = {
      transactions: (await db.get('SELECT COUNT(*) n FROM transactions WHERE business_id = ?', b.id)).n,
      shifts: (await db.get('SELECT COUNT(*) n FROM shifts WHERE business_id = ?', b.id)).n,
    };
    await db.run('DELETE FROM tx_items WHERE transaction_id IN (SELECT id FROM transactions WHERE business_id = ?)', b.id);
    await db.run('DELETE FROM transactions WHERE business_id = ?', b.id);
    await db.run('DELETE FROM shift_app_sales WHERE shift_id IN (SELECT id FROM shifts WHERE business_id = ?)', b.id);
    await db.run('DELETE FROM shifts WHERE business_id = ?', b.id);
    if (x.zero_openings) {
      await db.run('UPDATE businesses SET opening_balance = 0 WHERE id = ?', b.id);
      await db.run('UPDATE delivery_apps SET opening_receivable = 0 WHERE business_id = ?', b.id);
      await db.run('UPDATE creditors SET opening_balance = 0 WHERE business_id = ?', b.id);
    }
    if (x.delete_creditors) await db.run('DELETE FROM creditors WHERE business_id = ?', b.id);
    if (x.clear_log) await db.run('DELETE FROM audit_log WHERE business_id = ?', b.id);
    return c;
  });
  await audit(b.id, req.user.id, 'business_reset', { name: b.name, ...counts, zero_openings: !!x.zero_openings, delete_creditors: !!x.delete_creditors, backup });
  return { ok: true, ...counts, backup };
}));

admin.get('/users', wrap(async () => {
  const users = await db.all('SELECT id, username, name, is_admin, active, created_at FROM users ORDER BY id');
  const access = await db.all('SELECT * FROM user_business');
  return users.map(u => ({ ...u, access: access.filter(a => a.user_id === u.id).map(a => ({ business_id: a.business_id, permissions: JSON.parse(a.permissions) })) }));
}));
async function saveAccess(userId, access) {
  await db.run('DELETE FROM user_business WHERE user_id = ?', userId);
  const valid = new Set((await db.all('SELECT id FROM businesses')).map(b => b.id));
  for (const a of access || []) {
    const bid = idOf(a.business_id);
    if (!valid.has(bid)) continue;
    const perms = (a.permissions || []).filter(p => ALL_PERMS.includes(p));
    await db.run('INSERT INTO user_business (user_id, business_id, permissions) VALUES (?,?,?)', userId, bid, JSON.stringify(perms));
  }
}
admin.post('/users', wrap(async (req) => {
  const { username, name, password, is_admin, access } = req.body || {};
  if (!username || !name) bad('اسم المستخدم والاسم مطلوبان');
  if (!password || String(password).length < PW_MIN) bad('كلمة المرور يجب أن تكون {n} أحرف على الأقل', { n: PW_MIN });
  if (await db.get('SELECT 1 x FROM users WHERE lower(username) = lower(?)', String(username).trim())) bad('اسم المستخدم مستخدم مسبقاً');
  const id = await db.tx(async () => {
    const uid = await db.insert('INSERT INTO users (username, name, password_hash, is_admin) VALUES (?,?,?,?)',
      String(username).trim(), String(name).trim(), bcrypt.hashSync(String(password), 10), is_admin ? 1 : 0);
    await saveAccess(uid, access);
    return uid;
  });
  await audit(null, req.user.id, 'user_create', { username });
  return { id };
}));
admin.put('/users/:id', wrap(async (req) => {
  const u = await db.get('SELECT * FROM users WHERE id = ?', idOf(req.params.id));
  if (!u) throw new HttpError(404, 'غير موجود');
  const { name, password, is_admin, active, access } = req.body || {};
  if (u.id === req.user.id && (!is_admin || !active)) bad('لا يمكنك إلغاء صلاحية المدير أو تعطيل حسابك');
  if (password && String(password).length < PW_MIN) bad('كلمة المرور يجب أن تكون {n} أحرف على الأقل', { n: PW_MIN });
  await db.tx(async () => {
    await db.run('UPDATE users SET name=?, is_admin=?, active=? WHERE id=?', String(name || u.name).trim(), is_admin ? 1 : 0, active ? 1 : 0, u.id);
    if (password) await db.run('UPDATE users SET password_hash=? WHERE id=?', bcrypt.hashSync(String(password), 10), u.id);
    // deactivated or password reset → that user is signed out everywhere (never your own session)
    if ((!active || password) && u.id !== req.user.id) await db.run('DELETE FROM sessions WHERE user_id = ?', u.id);
    await saveAccess(u.id, access);
  });
  await audit(null, req.user.id, 'user_update', { username: u.username, password_changed: !!password });
  return { ok: true };
}));
// download a full copy of all data (keep it somewhere safe, off the server)
admin.get('/backup', wrap(async (req, res) => {
  const stamp = nowLocal().replace(/[: ]/g, '-');
  await audit(null, req.user.id, 'backup_download', { ip: req.ip });
  if (db.dialect === 'sqlite') {
    const tmp = path.join(os.tmpdir(), `dc-backup-${crypto.randomBytes(6).toString('hex')}.db`);
    await db.backupFile(tmp);
    res.download(tmp, `daily-closing-backup-${stamp}.db`, () => fs.unlink(tmp, () => { }));
    return;
  }
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="daily-closing-backup-${stamp}.json"`);
  res.send(JSON.stringify(await exportAll()));
}));
admin.get('/audit', wrap(() => db.all(`SELECT a.*, u.name user_name, b.name business_name FROM audit_log a
  LEFT JOIN users u ON u.id = a.user_id LEFT JOIN businesses b ON b.id = a.business_id ORDER BY a.id DESC LIMIT 300`)));
app.use('/api/admin', admin);

// ───────────────────────── business scope ─────────────────────────
const biz = express.Router({ mergeParams: true });
biz.use(async (req, res, next) => {
  const b = await db.get('SELECT * FROM businesses WHERE id = ?', idOf(req.params.bid));
  if (!b || (!b.active && !req.user.is_admin)) return jerr(req, res, 404, 'النشاط غير موجود');
  let perms;
  if (req.user.is_admin) perms = ALL_PERMS;
  else {
    const ub = await db.get('SELECT permissions FROM user_business WHERE user_id = ? AND business_id = ?', req.user.id, b.id);
    if (!ub) return jerr(req, res, 403, 'ليس لديك صلاحية على هذا النشاط');
    perms = JSON.parse(ub.permissions);
  }
  req.biz = b;
  req.perms = new Set(perms);
  req.can = (p) => req.perms.has(p);
  next();
});
const need = (...ps) => (req, res, next) => ps.some(p => req.can(p)) ? next() : jerr(req, res, 403, 'ليس لديك صلاحية لهذه العملية');

// ---------- financial core ----------
const openShift = (bid) => db.get("SELECT * FROM shifts WHERE business_id = ? AND status = 'open' ORDER BY id DESC LIMIT 1", bid);
// cashier never "opens" a shift: it is created on the first invoice or at closing
async function ensureOpenShift(req) {
  const s = await openShift(req.biz.id);
  if (s) return s;
  const date = workDate(req.biz);
  let id;
  try { id = await db.insert('INSERT INTO shifts (business_id, date, opening_float, opened_by) VALUES (?,?,?,?)', req.biz.id, date, req.biz.cash_float, req.user.id); }
  catch (e) { const again = await openShift(req.biz.id); if (again) return again; throw e; } // another request opened it at the same moment
  await audit(req.biz.id, req.user.id, 'shift_open', { id, date, auto: true });
  return db.get('SELECT * FROM shifts WHERE id = ?', id);
}
// re-derive expected cash & difference of a closed shift (after any edit to it or its drawer transactions)
async function recomputeShift(id) {
  const s = id && await db.get('SELECT * FROM shifts WHERE id = ?', id);
  if (!s || s.status !== 'closed') return;
  const { drawerNet } = await shiftDrawer(s);
  const expected = r2(s.opening_float + s.cash_sales + drawerNet);
  const difference = s.counted_at ? r2(s.counted_cash + s.cash_with_staff - expected) : 0;
  await db.run('UPDATE shifts SET expected_cash = ?, difference = ? WHERE id = ?', expected, difference, id);
}
// human-readable snapshots for the edits log
async function shiftSnap(id) {
  const s = await db.get('SELECT * FROM shifts WHERE id = ?', id);
  const apps = await db.all('SELECT a.name, sa.amount FROM shift_app_sales sa JOIN delivery_apps a ON a.id = sa.app_id WHERE sa.shift_id = ?', id);
  return {
    date: s.date, cash_sales: s.cash_sales, card_sales: s.card_sales, apps: Object.fromEntries(apps.map(a => [a.name, a.amount])),
    orders_count: s.orders_count, counted_cash: s.counted_at ? s.counted_cash : null, cash_with_staff: s.counted_at ? s.cash_with_staff : null,
    expected_cash: s.expected_cash, difference: s.counted_at ? s.difference : null, notes: s.notes || '',
  };
}
async function txSnap(t) {
  const nm = async (table, id) => id ? (await db.get(`SELECT name FROM ${table} WHERE id = ?`, id))?.name : null;
  const items = t.items || (t.id ? await loadItems(t.id) : []);
  return {
    type: t.type, payment_method: t.payment_method, amount: t.amount, fee: t.fee || 0, date: t.date, category: await nm('categories', t.category_id),
    supplier: t.supplier || '', invoice_no: t.invoice_no || '', creditor: await nm('creditors', t.creditor_id), app: await nm('delivery_apps', t.app_id), description: t.description || '',
    items: items.map(i => `${i.name} ${i.qty}×${i.price}`).join('، '),
  };
}
async function parseSales(req, x) {
  const cash_sales = num(x.cash_sales), card_sales = num(x.card_sales || 0);
  if (!(cash_sales >= 0) || !(card_sales >= 0)) bad('أدخل مبالغ الكاش والشبكة بشكل صحيح');
  const apps = (Array.isArray(x.apps) ? x.apps : []).map(a => ({ app_id: idOf(a.app_id), amount: num(a.amount || 0), orders_count: Math.max(0, parseInt(a.orders_count) || 0) }));
  if (apps.some(a => !(a.amount >= 0))) bad('مبيعات التطبيقات غير صحيحة');
  const valid = new Set((await db.all('SELECT id FROM delivery_apps WHERE business_id = ?', req.biz.id)).map(a => a.id));
  if (apps.some(a => !valid.has(a.app_id))) bad('تطبيق غير معروف');
  return { cash_sales: r2(cash_sales), card_sales: r2(card_sales), apps, app_sales: r2(apps.reduce((t, a) => t + a.amount, 0)), orders_count: Math.max(0, parseInt(x.orders_count) || 0) };
}
function parseCount(x) {
  if (x.counted_cash === undefined || x.counted_cash === null || x.counted_cash === '') return null;
  const c = num(x.counted_cash), st = num(x.cash_with_staff || 0);
  if (!(c >= 0) || !(st >= 0)) bad('مبلغ النقد غير صحيح');
  return { counted_cash: r2(c), cash_with_staff: r2(st) };
}
async function saveAppSales(shiftId, apps) {
  await db.run('DELETE FROM shift_app_sales WHERE shift_id = ?', shiftId);
  for (const a of apps) if (a.amount > 0 || a.orders_count > 0)
    await db.run('INSERT INTO shift_app_sales (shift_id, app_id, amount, orders_count) VALUES (?,?,?,?)', shiftId, a.app_id, r2(a.amount), a.orders_count);
}

async function balanceAsOf(b, date) {
  const s = (await db.get(`SELECT COALESCE(SUM(cash_sales + card_sales + app_sales - card_fee + difference),0) v
                           FROM shifts WHERE business_id = ? AND status = 'closed' AND date <= ?`, b.id, date)).v;
  const txs = await db.all(`SELECT type, payment_method, SUM(amount) amount, SUM(fee) fee FROM transactions
                            WHERE business_id = ? AND deleted_at IS NULL AND date <= ? GROUP BY type, payment_method`, b.id, date);
  return r2(b.opening_balance + s + txs.reduce((t, x) => t + balanceEffect(x), 0));
}
async function receivablesAsOf(bid, date) {
  const apps = await db.all('SELECT id, name, opening_receivable, active FROM delivery_apps WHERE business_id = ? ORDER BY id', bid);
  const sales = await db.all(`SELECT sa.app_id, SUM(sa.amount) v FROM shift_app_sales sa JOIN shifts s ON s.id = sa.shift_id
                              WHERE s.business_id = ? AND s.status = 'closed' AND s.date <= ? GROUP BY sa.app_id`, bid, date);
  const coll = await db.all(`SELECT app_id, SUM(amount + fee) v FROM transactions WHERE business_id = ? AND type = 'app_settlement'
                             AND deleted_at IS NULL AND date <= ? GROUP BY app_id`, bid, date);
  const list = apps.map(a => {
    const sold = sales.find(x => x.app_id === a.id)?.v || 0;
    const collected = coll.find(x => x.app_id === a.id)?.v || 0;
    return { ...a, sold: r2(sold), collected: r2(collected), balance: r2(a.opening_receivable + sold - collected) };
  });
  return { list, total: r2(list.reduce((t, a) => t + a.balance, 0)) };
}
async function debtsAsOf(bid, date) {
  const cr = await db.all('SELECT id, name, opening_balance, active FROM creditors WHERE business_id = ? AND deleted_at IS NULL ORDER BY id', bid);
  const rows = await db.all(`SELECT creditor_id, type, payment_method, SUM(amount) v FROM transactions WHERE business_id = ? AND creditor_id IS NOT NULL
                             AND deleted_at IS NULL AND date <= ? GROUP BY creditor_id, type, payment_method`, bid, date);
  const list = cr.map(c => {
    let added = 0, paid = 0;
    for (const r of rows.filter(r => r.creditor_id === c.id)) {
      if (r.type === 'loan' || (['purchase', 'expense'].includes(r.type) && r.payment_method === 'credit')) added += r.v;
      if (r.type === 'debt_payment' || r.type === 'debt_writeoff') paid += r.v;
    }
    return { ...c, added: r2(added), paid: r2(paid), balance: r2(c.opening_balance + added - paid) };
  });
  return { list, total: r2(list.reduce((t, c) => t + c.balance, 0)) };
}
// per creditor: owed at the start, added / paid during [from..to], owed at the end — for the reports
async function debtsPeriod(bid, from, to) {
  const start = (await debtsAsOf(bid, addDays(from, -1))).list, end = (await debtsAsOf(bid, to)).list;
  const list = end.map(e => {
    const s = start.find(x => x.id === e.id) || { balance: e.opening_balance, added: 0, paid: 0 };
    return { id: e.id, name: e.name, start: s.balance, added: r2(e.added - s.added), paid: r2(e.paid - s.paid), balance: e.balance };
  }).filter(c => c.start || c.added || c.paid || c.balance);
  const sum = (k) => r2(list.reduce((t, c) => t + c[k], 0));
  return { list, start: sum('start'), added: sum('added'), paid: sum('paid'), total: sum('balance') };
}
async function shiftDrawer(shift) {
  const txs = await db.all('SELECT * FROM transactions WHERE shift_id = ? AND deleted_at IS NULL ORDER BY id', shift.id);
  return { txs, drawerNet: r2(txs.reduce((t, x) => t + drawerEffect(x), 0)) };
}

// movement over a date range (inclusive)
async function movement(b, from, to) {
  const sh = await db.get(`SELECT COALESCE(SUM(cash_sales),0) cash, COALESCE(SUM(card_sales),0) card, COALESCE(SUM(app_sales),0) apps,
    COALESCE(SUM(orders_count),0) orders, COALESCE(SUM(card_fee),0) card_fee, COALESCE(SUM(difference),0) diff,
    COALESCE(SUM(CASE WHEN difference < 0 THEN difference END),0) shortage, COALESCE(SUM(CASE WHEN difference > 0 THEN difference END),0) surplus,
    COUNT(*) shifts FROM shifts WHERE business_id = ? AND status = 'closed' AND date BETWEEN ? AND ?`, b.id, from, to);
  const appRows = await db.all(`SELECT a.id, a.name, COALESCE(SUM(sa.amount),0) amount, COALESCE(SUM(sa.orders_count),0) orders
    FROM delivery_apps a LEFT JOIN shift_app_sales sa ON sa.app_id = a.id AND sa.shift_id IN
      (SELECT id FROM shifts WHERE business_id = ? AND status = 'closed' AND date BETWEEN ? AND ?)
    WHERE a.business_id = ? GROUP BY a.id, a.name ORDER BY a.id`, b.id, from, to, b.id);
  const txs = await db.all(`SELECT type, payment_method, SUM(amount) amount, SUM(fee) fee FROM transactions
    WHERE business_id = ? AND deleted_at IS NULL AND date BETWEEN ? AND ? GROUP BY type, payment_method`, b.id, from, to);
  const sum = (f) => r2(txs.filter(f).reduce((t, x) => t + x.amount, 0));
  const total = r2(sh.cash + sh.card + sh.apps);
  const m = {
    sales: { cash: r2(sh.cash), card: r2(sh.card), apps: r2(sh.apps), total, orders: sh.orders, avg: sh.orders ? r2(total / sh.orders) : 0, byApp: appRows.map(a => ({ ...a, amount: r2(a.amount) })) },
    shifts: sh.shifts,
    card_fee: r2(sh.card_fee),
    cash_diff: r2(sh.diff), shortage: r2(sh.shortage), surplus: r2(sh.surplus),
    purchases_paid: sum(x => x.type === 'purchase' && x.payment_method !== 'credit'),
    purchases_credit: sum(x => x.type === 'purchase' && x.payment_method === 'credit'),
    expenses_paid: sum(x => x.type === 'expense' && x.payment_method !== 'credit'),
    expenses_credit: sum(x => x.type === 'expense' && x.payment_method === 'credit'),
    debt_payments: sum(x => x.type === 'debt_payment'),
    loans: sum(x => x.type === 'loan'),
    owner_deposits: sum(x => x.type === 'owner_deposit'),
    withdrawals: sum(x => x.type === 'withdrawal'),
    adjustments: sum(x => x.type === 'adjustment'),
    app_collected: sum(x => x.type === 'app_settlement'),
    app_commission: r2(txs.filter(x => x.type === 'app_settlement').reduce((t, x) => t + x.fee, 0)),
  };
  m.net_movement = r2(total - m.card_fee + m.cash_diff + txs.reduce((t, x) => t + balanceEffect(x), 0));
  // operating result (accrual): sales - fees - commissions - all purchases & expenses (incl. on credit)
  m.operating_result = r2(total - m.card_fee - m.app_commission - m.purchases_paid - m.purchases_credit - m.expenses_paid - m.expenses_credit);
  return m;
}
// the same figures per day for a whole range in two queries (charts / daily tables)
async function dailySeries(b, from, to) {
  const sh = await db.all(`SELECT date, SUM(cash_sales) cash, SUM(card_sales) card, SUM(app_sales) apps, SUM(orders_count) orders,
    SUM(card_fee) card_fee, SUM(difference) diff, COUNT(*) n FROM shifts
    WHERE business_id = ? AND status = 'closed' AND date BETWEEN ? AND ? GROUP BY date`, b.id, from, to);
  const tx = await db.all(`SELECT date, type, payment_method, SUM(amount) amount, SUM(fee) fee FROM transactions
    WHERE business_id = ? AND deleted_at IS NULL AND date BETWEEN ? AND ? GROUP BY date, type, payment_method`, b.id, from, to);
  const days = new Map();
  const day = (d) => days.get(d) || days.set(d, { date: d, sales: 0, cash: 0, card: 0, apps: 0, orders: 0, purchases: 0, expenses: 0, diff: 0, fees: 0, shifts: 0 }).get(d);
  for (const s of sh) Object.assign(day(s.date), { cash: r2(s.cash), card: r2(s.card), apps: r2(s.apps), sales: r2(s.cash + s.card + s.apps), orders: s.orders, diff: r2(s.diff), fees: s.card_fee, shifts: s.n });
  for (const t of tx) {
    const d = day(t.date);
    if (t.type === 'purchase') d.purchases = r2(d.purchases + t.amount);
    if (t.type === 'expense') d.expenses = r2(d.expenses + t.amount);
    if (t.type === 'app_settlement') d.fees += t.fee;
  }
  for (const d of days.values()) { d.result = r2(d.sales - d.fees - d.purchases - d.expenses); delete d.fees; }
  return days;
}

// ---------- meta & settings ----------
biz.get('/meta', wrap(async (req) => {
  const b = req.biz;
  return {
    business: { id: b.id, name: b.name, logo_v: b.logo_updated, theme: b.theme ? JSON.parse(b.theme) : null, card_fee_pct: b.card_fee_pct, cash_float: b.cash_float, cashier_counts: b.cashier_counts, day_start_hour: b.day_start_hour,
      opening_balance: req.can('balance_view') ? b.opening_balance : undefined },
    work_date: workDate(b),
    permissions: [...req.perms],
    apps: await db.all('SELECT * FROM delivery_apps WHERE business_id = ? ORDER BY active DESC, id', b.id),
    categories: await db.all('SELECT * FROM categories WHERE business_id = ? ORDER BY kind, active DESC, id', b.id),
    creditors: await db.all('SELECT * FROM creditors WHERE business_id = ? AND deleted_at IS NULL ORDER BY active DESC, id', b.id),
    openShift: (await openShift(b.id)) || null,
  };
}));
biz.put('/settings', need('settings_manage'), wrap(async (req) => {
  const b = req.biz, x = req.body || {};
  const pick = (k, f) => x[k] !== undefined ? f(x[k]) : b[k];
  const after = {
    name: pick('name', v => { v = String(v || '').trim().slice(0, 100); if (!v) bad('اسم النشاط مطلوب'); return v; }),
    card_fee_pct: pick('card_fee_pct', v => num(v) || 0),
    cash_float: pick('cash_float', v => num(v) || 0),
    opening_balance: req.can('balance_view') ? pick('opening_balance', v => num(v) || 0) : b.opening_balance,
    cashier_counts: pick('cashier_counts', v => (v && v !== '0' && v !== 'false') ? 1 : 0),
    day_start_hour: pick('day_start_hour', v => Math.min(12, Math.max(0, parseInt(v) || 0))),
  };
  await db.run('UPDATE businesses SET name=?, card_fee_pct=?, cash_float=?, opening_balance=?, cashier_counts=?, day_start_hour=? WHERE id=?',
    after.name, after.card_fee_pct, after.cash_float, after.opening_balance, after.cashier_counts, after.day_start_hour, b.id);
  const before = Object.fromEntries(Object.keys(after).map(k => [k, b[k]]));
  await audit(b.id, req.user.id, 'settings_update', { before, after });
  return { ok: true };
}));
// default appearance for all users of the business (each device can still override it)
const THEME_OPTS = { mode: ['light', 'dark', 'auto'], bg: ['neutral', 'tint', 'white', 'warm'], side: ['light', 'brand', 'dark'], radius: ['sm', 'md', 'lg'], size: ['md', 'lg'], density: ['comfy', 'compact'], font: ['plex', 'tajawal', 'cairo', 'almarai', 'kufi'] };
biz.put('/theme', need('settings_manage'), wrap(async (req) => {
  const x = req.body || {}, t = {};
  for (const [k, vals] of Object.entries(THEME_OPTS)) if (vals.includes(x[k])) t[k] = x[k];
  if (/^#[0-9a-f]{6}$/i.test(x.accent || '')) t.accent = x.accent.toLowerCase();
  await db.run('UPDATE businesses SET theme = ? WHERE id = ?', JSON.stringify(t), req.biz.id);
  await audit(req.biz.id, req.user.id, 'theme_update', { after: t });
  return { ok: true };
}));

// business logo — the browser resizes it first, so it's stored inline as a small data URL
const LOGO_RE = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/;
biz.get('/logo', wrap((req, res) => {
  const m = req.biz.logo && LOGO_RE.exec(req.biz.logo);
  if (!m) throw new HttpError(404, 'لا يوجد شعار');
  res.set('Content-Type', m[1]);
  res.set('Cache-Control', 'private, max-age=31536000'); // URL carries ?v=<logo_updated>
  res.send(Buffer.from(m[2], 'base64'));
}));
biz.put('/logo', need('settings_manage'), wrap(async (req) => {
  const data = String(req.body?.data || '');
  if (!LOGO_RE.test(data)) bad('صيغة الصورة غير مدعومة — استخدم PNG أو JPG');
  if (data.length > 700 * 1024) bad('حجم الشعار كبير جداً');
  await db.run('UPDATE businesses SET logo = ?, logo_updated = ? WHERE id = ?', data, String(Date.now()), req.biz.id);
  await audit(req.biz.id, req.user.id, 'logo_update', { before: { logo: req.biz.logo ? 'شعار سابق' : 'بدون شعار' }, after: { logo: 'شعار جديد' } });
  return { ok: true };
}));
biz.delete('/logo', need('settings_manage'), wrap(async (req) => {
  await db.run('UPDATE businesses SET logo = NULL, logo_updated = NULL WHERE id = ?', req.biz.id);
  await audit(req.biz.id, req.user.id, 'logo_update', { before: { logo: 'شعار سابق' }, after: { logo: 'بدون شعار' } });
  return { ok: true };
}));

// simple lists: apps / categories / creditors
const LISTS = {
  apps: { table: 'delivery_apps', fields: ['name', 'opening_receivable', 'active'], perm: ['settings_manage'] },
  categories: { table: 'categories', fields: ['name', 'kind', 'active'], perm: ['settings_manage'] },
  creditors: { table: 'creditors', fields: ['name', 'opening_balance', 'active'], perm: ['settings_manage', 'finance_manage'] },
};
for (const [key, L] of Object.entries(LISTS)) {
  const clean = (body, prev = {}) => {
    const o = {};
    for (const f of L.fields) {
      let v = body[f] !== undefined ? body[f] : prev[f];
      if (f === 'name') { v = String(v || '').trim().slice(0, 200); if (!v) bad('الاسم مطلوب'); }
      else if (f === 'kind') { if (!['purchase', 'expense'].includes(v)) bad('نوع التصنيف غير صحيح'); }
      else if (f === 'active') v = v === undefined ? 1 : (v ? 1 : 0);
      else v = num(v) || 0;
      o[f] = v;
    }
    return o;
  };
  const noDuplicate = async (req, o, id = 0) => {
    const kindSql = L.fields.includes('kind') ? ' AND kind = ?' : '';
    const delSql = L.table === 'creditors' ? ' AND deleted_at IS NULL' : '';
    const dup = await db.get(`SELECT 1 x FROM ${L.table} WHERE business_id = ? AND name = ? AND id != ?${delSql}${kindSql}`,
      req.biz.id, o.name, id, ...(kindSql ? [o.kind] : []));
    if (dup) bad('الاسم «{name}» موجود مسبقاً — إن كان مخفياً فأظهره بدلاً من إضافته من جديد', { name: o.name });
  };
  biz.post('/' + key, need(...L.perm), wrap(async (req) => {
    const o = clean(req.body || {});
    await noDuplicate(req, o);
    const id = await db.insert(`INSERT INTO ${L.table} (business_id, ${L.fields.join(',')}) VALUES (?, ${L.fields.map(() => '?').join(',')})`,
      req.biz.id, ...L.fields.map(f => o[f]));
    await audit(req.biz.id, req.user.id, key + '_create', { id, after: o });
    return { id };
  }));
  biz.put('/' + key + '/:id', need(...L.perm), wrap(async (req) => {
    const prev = await db.get(`SELECT * FROM ${L.table} WHERE id = ? AND business_id = ?`, idOf(req.params.id), req.biz.id);
    if (!prev) throw new HttpError(404, 'غير موجود');
    const o = clean(req.body || {}, prev);
    await noDuplicate(req, o, prev.id);
    await db.run(`UPDATE ${L.table} SET ${L.fields.map(f => f + '=?').join(',')} WHERE id = ?`, ...L.fields.map(f => o[f]), prev.id);
    await audit(req.biz.id, req.user.id, key + '_update', { id: prev.id, before: Object.fromEntries(L.fields.map(f => [f, prev[f]])), after: o });
    return { ok: true };
  }));
}

// delete a creditor (debt account). Its linked movements (debts, payments, credit purchases) are
// soft-deleted with it, which also reverses their effect on the company balance — all logged.
biz.delete('/creditors/:id', need('finance_manage', 'settings_manage'), wrap(async (req) => {
  const c = await db.get('SELECT * FROM creditors WHERE id = ? AND business_id = ? AND deleted_at IS NULL', idOf(req.params.id), req.biz.id);
  if (!c) throw new HttpError(404, 'الدائن غير موجود');
  const txs = await db.all('SELECT * FROM transactions WHERE creditor_id = ? AND deleted_at IS NULL', c.id);
  if (txs.length && !req.can('tx_edit')) throw new HttpError(403, 'لهذا الدائن حركات مسجلة — حذفه يحتاج صلاحية تعديل وحذف الحركات');
  const debt = (await debtsAsOf(req.biz.id, MAX_DATE)).list.find(x => x.id === c.id);
  const balanceChange = r2(-txs.reduce((t, x) => t + balanceEffect(x), 0));
  const now = nowLocal();
  await db.tx(async () => {
    for (const t of txs) {
      await db.run('UPDATE transactions SET deleted_at = ?, deleted_by = ? WHERE id = ?', now, req.user.id, t.id);
      await recomputeShift(t.shift_id);
    }
    await db.run('UPDATE creditors SET deleted_at = ?, active = 0 WHERE id = ?', now, c.id);
  });
  await audit(req.biz.id, req.user.id, 'creditors_delete', {
    id: c.id, before: { name: c.name, opening_balance: c.opening_balance, debt: debt ? debt.balance : 0, movements: txs.length },
  });
  return { ok: true, deleted_movements: txs.length, balance_change: balanceChange };
}));

// ---------- summary (dashboard) ----------
biz.get('/summary', need('balance_view'), wrap(async (req) => {
  const b = req.biz, t = today();
  const balance = await balanceAsOf(b, MAX_DATE);
  const receivables = await receivablesAsOf(b.id, MAX_DATE);
  const debts = await debtsAsOf(b.id, MAX_DATE);
  const os = await openShift(b.id);
  const series = await dailySeries(b, addDays(t, -6), t);
  return {
    balance, receivables, debts, net_position: r2(balance - debts.total),
    today: await movement(b, t, t), month: await movement(b, t.slice(0, 8) + '01', t),
    openShift: os ? { ...os, opened_by_name: (await db.get('SELECT name FROM users WHERE id = ?', os.opened_by))?.name } : null,
    pending_cash: (await db.get("SELECT COUNT(*) n FROM shifts WHERE business_id = ? AND status = 'closed' AND counted_at IS NULL", b.id)).n,
    last7: Array.from({ length: 7 }, (_, i) => { const d = addDays(t, i - 6), x = series.get(d); return { date: d, sales: x ? x.sales : 0, out: x ? r2(x.purchases + x.expenses) : 0 }; }),
  };
}));

// ---------- shifts ----------
async function shiftView(req, s) {
  const { txs, drawerNet } = await shiftDrawer(s);
  const apps = await db.all(`SELECT a.id app_id, a.name, COALESCE(sa.amount,0) amount, COALESCE(sa.orders_count,0) orders_count FROM delivery_apps a
    LEFT JOIN shift_app_sales sa ON sa.app_id = a.id AND sa.shift_id = ? WHERE a.business_id = ? AND (a.active = 1 OR sa.amount IS NOT NULL) ORDER BY a.id`, s.id, s.business_id);
  const names = await db.all('SELECT id, name FROM users');
  const nm = (id) => names.find(u => u.id === id)?.name || '';
  const out = { ...s, opened_by_name: nm(s.opened_by), closed_by_name: nm(s.closed_by), apps,
    transactions: await attachItems(txs.map(t => ({ ...t, created_by_name: nm(t.created_by) }))), drawer_out: r2(-drawerNet) };
  if (!showExpected(req)) {
    if (s.status === 'open') out.expected_now = undefined;
    out.expected_cash = undefined; out.difference = undefined;
  } else if (s.status === 'open') {
    out.expected_now = r2(s.opening_float + drawerNet); // before cash sales
  }
  return out;
}

async function getShift(req) {
  const s = await db.get('SELECT * FROM shifts WHERE id = ? AND business_id = ?', idOf(req.params.id), req.biz.id);
  if (!s) throw new HttpError(404, 'الشفت غير موجود');
  return s;
}
const showExpected = (req) => req.can('shift_view_expected') || req.can('reports_view');

biz.get('/shifts/current', wrap(async (req) => {
  const s = await openShift(req.biz.id);
  const last = await db.get(`SELECT s.id, s.date, s.closed_at, s.cash_sales, s.card_sales, s.app_sales, u.name closed_by_name FROM shifts s
    LEFT JOIN users u ON u.id = s.closed_by WHERE s.business_id = ? AND s.status = 'closed' ORDER BY s.closed_at DESC, s.id DESC LIMIT 1`, req.biz.id);
  return { shift: s ? await shiftView(req, s) : null, cash_float: req.biz.cash_float, work_date: workDate(req.biz), last_closed: last || null };
}));

biz.post('/shifts/open', need('shift_manage'), wrap(async (req) => {
  if (await openShift(req.biz.id)) bad('يوجد شفت مفتوح بالفعل، أقفله أولاً');
  const { date = workDate(req.biz), opening_float } = req.body || {};
  if (!isDate(date)) bad('التاريخ غير صحيح');
  const f = opening_float === undefined || opening_float === '' ? req.biz.cash_float : num(opening_float);
  if (!(f >= 0)) bad('العهدة غير صحيحة');
  const id = await db.insert('INSERT INTO shifts (business_id, date, opening_float, opened_by) VALUES (?,?,?,?)', req.biz.id, date, f, req.user.id);
  await audit(req.biz.id, req.user.id, 'shift_open', { id, date, float: f });
  return { id };
}));

async function closeShift(req, s) {
  const x = req.body || {};
  const sales = await parseSales(req, x);
  const count = parseCount(x);
  if (!count && req.biz.cashier_counts) bad('أدخل النقد المعدود في الدرج');
  await db.tx(async () => {
    await db.run(`UPDATE shifts SET status='closed', closed_by=?, closed_at=?, cash_sales=?, card_sales=?, app_sales=?, orders_count=?, card_fee=?,
      counted_cash=?, cash_with_staff=?, counted_by=?, counted_at=?, notes=? WHERE id=?`,
      req.user.id, nowLocal(), sales.cash_sales, sales.card_sales, sales.app_sales, sales.orders_count, r2(sales.card_sales * req.biz.card_fee_pct / 100),
      count ? count.counted_cash : 0, count ? count.cash_with_staff : 0, count ? req.user.id : null, count ? nowLocal() : null,
      String(x.notes || '').slice(0, 1000), s.id);
    await saveAppSales(s.id, sales.apps);
    await recomputeShift(s.id);
  });
  const after = await db.get('SELECT * FROM shifts WHERE id = ?', s.id);
  await audit(req.biz.id, req.user.id, 'shift_close', { id: s.id, date: s.date, after: await shiftSnap(s.id) });
  const res = { ok: true, id: s.id, date: s.date, total: r2(sales.cash_sales + sales.card_sales + sales.app_sales), counted: !!count };
  if (showExpected(req)) Object.assign(res, { expected: after.expected_cash, actual: count ? r2(count.counted_cash + count.cash_with_staff) : null, difference: count ? after.difference : null });
  return res;
}
biz.post('/shifts/:id/close', need('shift_manage'), wrap(async (req) => {
  const s = await getShift(req);
  if (s.status !== 'open') bad('الشفت مقفل بالفعل');
  return closeShift(req, s);
}));
// simple cashier flow: close "today" without caring about shift ids
biz.post('/shifts/close-current', need('shift_manage'), wrap(async (req) => {
  await parseSales(req, req.body || {}); // validate before creating anything
  return closeShift(req, await ensureOpenShift(req));
}));

// accountant/owner receives the cash handed over by the cashier
biz.post('/shifts/:id/receive', need('shift_reopen'), wrap(async (req) => {
  const s = await getShift(req);
  if (s.status !== 'closed') bad('هذا اليوم لم يُقفل بعد');
  const count = parseCount(req.body || {});
  if (!count) bad('أدخل مبلغ النقد المستلم');
  const before = await shiftSnap(s.id);
  await db.tx(async () => {
    await db.run('UPDATE shifts SET counted_cash=?, cash_with_staff=?, counted_by=?, counted_at=? WHERE id=?',
      count.counted_cash, count.cash_with_staff, req.user.id, nowLocal(), s.id);
    await recomputeShift(s.id);
  });
  const after = await db.get('SELECT * FROM shifts WHERE id = ?', s.id);
  await audit(req.biz.id, req.user.id, 'cash_receive', { id: s.id, date: s.date, before, after: await shiftSnap(s.id) });
  return { ok: true, expected: after.expected_cash, actual: r2(count.counted_cash + count.cash_with_staff), difference: after.difference };
}));

// edit a closed shift directly (sales figures / cash count) — fully logged
biz.put('/shifts/:id', need('shift_reopen'), wrap(async (req) => {
  const s = await getShift(req);
  if (s.status !== 'closed') bad('هذا اليوم لم يُقفل بعد');
  const x = req.body || {};
  const sales = await parseSales(req, x);
  const count = parseCount(x);
  const date = isDate(x.date) ? x.date : s.date;
  const before = await shiftSnap(s.id);
  await db.tx(async () => {
    await db.run('UPDATE shifts SET date=?, cash_sales=?, card_sales=?, app_sales=?, orders_count=?, card_fee=?, notes=? WHERE id=?',
      date, sales.cash_sales, sales.card_sales, sales.app_sales, sales.orders_count, r2(sales.card_sales * req.biz.card_fee_pct / 100), String(x.notes ?? s.notes ?? '').slice(0, 1000), s.id);
    if (count) await db.run('UPDATE shifts SET counted_cash=?, cash_with_staff=?, counted_by=COALESCE(counted_by, ?), counted_at=COALESCE(counted_at, ?) WHERE id=?',
      count.counted_cash, count.cash_with_staff, req.user.id, nowLocal(), s.id);
    if (date !== s.date) await db.run("UPDATE transactions SET date = ? WHERE shift_id = ? AND payment_method = 'drawer'", date, s.id);
    await saveAppSales(s.id, sales.apps);
    await recomputeShift(s.id);
  });
  await audit(req.biz.id, req.user.id, 'shift_edit', { id: s.id, date, before, after: await shiftSnap(s.id) });
  return { ok: true };
}));

biz.post('/shifts/:id/reopen', need('shift_reopen'), wrap(async (req) => {
  const s = await getShift(req);
  if (s.status !== 'closed') bad('الشفت مفتوح بالفعل');
  if (await openShift(req.biz.id)) bad('يوجد يوم آخر لم يُقفل بعد — أقفله أولاً أو استخدم «تعديل أرقام الإقفال»');
  const before = await shiftSnap(s.id);
  await db.run("UPDATE shifts SET status='open' WHERE id = ?", s.id);
  await audit(req.biz.id, req.user.id, 'shift_reopen', { id: s.id, date: s.date, before });
  return { ok: true };
}));

biz.get('/shifts', need('reports_view', 'shift_reopen'), wrap((req) => {
  const from = isDate(req.query.from) ? req.query.from : addDays(today(), -30);
  const to = isDate(req.query.to) ? req.query.to : today();
  return db.all(`SELECT s.*, uo.name opened_by_name, uc.name closed_by_name FROM shifts s
    LEFT JOIN users uo ON uo.id = s.opened_by LEFT JOIN users uc ON uc.id = s.closed_by
    WHERE s.business_id = ? AND s.date BETWEEN ? AND ? ORDER BY s.date DESC, s.id DESC`, req.biz.id, from, to);
}));
biz.get('/shifts/:id', wrap(async (req) => {
  const s = await getShift(req);
  if (s.status === 'closed' && !req.can('reports_view') && !req.can('shift_reopen')) throw new HttpError(403, 'ليس لديك صلاحية');
  return shiftView(req, s);
}));

// ---------- transactions ----------
async function validateTx(req, x, existing) {
  const can = req.can;
  const type = x.type;
  if (!TX_TYPES[type]) bad('نوع الحركة غير صحيح');
  const finance = can('finance_manage');
  if (!finance && !['purchase', 'expense'].includes(type)) bad('ليس لديك صلاحية لهذا النوع من الحركات');
  let method = x.payment_method || 'drawer';
  if (!METHODS[method]) bad('طريقة الدفع غير صحيحة');
  if (!finance && method !== 'drawer') bad('يمكنك تسجيل الحركات المدفوعة من الدرج فقط');
  if (method === 'credit' && !['purchase', 'expense'].includes(type)) bad('الدفع الآجل متاح للمشتريات والمصروفات فقط');
  if (['app_settlement', 'adjustment', 'debt_writeoff'].includes(type)) method = 'company';

  // itemized invoice: amount is the sum of the lines
  let items = null;
  if (Array.isArray(x.items) && x.items.length && ['purchase', 'expense'].includes(type)) {
    if (x.items.length > 200) bad('عدد الأصناف كبير جداً');
    items = x.items.map((it, i) => {
      const name = String(it.name || '').trim().slice(0, 200);
      const qty = it.qty === undefined || it.qty === '' ? 1 : num(it.qty);
      const price = num(it.price);
      if (!name) bad('اكتب اسم الصنف في السطر {n}', { n: i + 1 });
      if (!(qty > 0)) bad('الكمية غير صحيحة في السطر {n}', { n: i + 1 });
      if (!(price >= 0)) bad('السعر غير صحيح في السطر {n}', { n: i + 1 });
      return { name, qty: r2(qty), price: r2(price), total: r2(qty * price) };
    });
  }
  const amount = items ? r2(items.reduce((t, it) => t + it.total, 0)) : num(x.amount);
  if (type === 'adjustment') { if (!Number.isFinite(amount) || amount === 0) bad('أدخل مبلغ التسوية (موجب للزيادة أو سالب للنقص)'); }
  else if (!(amount > 0)) bad('المبلغ يجب أن يكون أكبر من صفر');
  const fee = type === 'app_settlement' ? num(x.fee || 0) : 0;
  if (!(fee >= 0)) bad('العمولة غير صحيحة');

  let category_id = null, creditor_id = null, app_id = null;
  if (['purchase', 'expense'].includes(type) && x.category_id) {
    const c = await db.get('SELECT * FROM categories WHERE id = ? AND business_id = ?', idOf(x.category_id), req.biz.id);
    if (!c) bad('التصنيف غير صحيح');
    category_id = c.id;
  }
  if (method === 'credit' || ['loan', 'debt_payment', 'debt_writeoff'].includes(type)) {
    const c = idOf(x.creditor_id) && await db.get('SELECT * FROM creditors WHERE id = ? AND business_id = ? AND deleted_at IS NULL', idOf(x.creditor_id), req.biz.id);
    if (!c) bad('اختر الدائن / المورد');
    creditor_id = c.id;
    // a payment / write-off can't exceed what is still owed (when editing, the old amount counts back)
    if (['debt_payment', 'debt_writeoff'].includes(type)) {
      let remaining = (await debtsAsOf(req.biz.id, MAX_DATE)).list.find(d => d.id === c.id)?.balance || 0;
      if (existing && existing.creditor_id === c.id && ['debt_payment', 'debt_writeoff'].includes(existing.type)) remaining += existing.amount;
      if (num(x.amount) > r2(remaining) + 0.005) bad('المبلغ أكبر من الدين المتبقي ({remaining})', { remaining: r2(remaining).toFixed(2) });
    }
  }
  if (type === 'app_settlement') {
    const a = idOf(x.app_id) && await db.get('SELECT * FROM delivery_apps WHERE id = ? AND business_id = ?', idOf(x.app_id), req.biz.id);
    if (!a) bad('اختر التطبيق');
    app_id = a.id;
  }

  // date & shift
  let shift_id = null, date;
  if (method === 'drawer') {
    if (existing && existing.shift_id && existing.payment_method === 'drawer') {
      const s = await db.get('SELECT * FROM shifts WHERE id = ?', existing.shift_id);
      if (s.status !== 'open' && !can('tx_edit')) bad('تم إقفال اليوم — لا يمكن تعديل الحركة');
      shift_id = s.id; date = s.date;
    } else {
      const s = await ensureOpenShift(req); // all validation above passed — safe to auto-open
      shift_id = s.id; date = s.date;
    }
  } else {
    date = isDate(x.date) ? x.date : today();
  }
  return {
    type, payment_method: method, amount: r2(amount), fee: r2(fee), category_id, creditor_id, app_id, shift_id, date,
    supplier: String(x.supplier || '').trim().slice(0, 200) || null,
    invoice_no: String(x.invoice_no || '').trim().slice(0, 100) || null,
    description: String(x.description || '').trim().slice(0, 1000) || null,
    items: items || [],
  };
}

async function saveItems(txId, items) {
  await db.run('DELETE FROM tx_items WHERE transaction_id = ?', txId);
  for (const it of items || []) await db.run('INSERT INTO tx_items (transaction_id, name, qty, price, total) VALUES (?,?,?,?,?)', txId, it.name, it.qty, it.price, it.total);
}
const loadItems = (txId) => db.all('SELECT name, qty, price, total FROM tx_items WHERE transaction_id = ? ORDER BY id', txId);
// adds .items to a list of transaction rows
async function attachItems(rows) {
  if (!rows.length) return rows;
  const all = await db.all(`SELECT transaction_id, name, qty, price, total FROM tx_items WHERE transaction_id IN (${rows.map(() => '?').join(',')}) ORDER BY id`, ...rows.map(r => r.id));
  for (const r of rows) r.items = all.filter(i => i.transaction_id === r.id).map(({ transaction_id, ...i }) => i);
  return rows;
}
async function insertTx(req, t) {
  const id = await db.insert(`INSERT INTO transactions (business_id, shift_id, date, type, payment_method, amount, fee, category_id, creditor_id, app_id, supplier, invoice_no, description, created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, req.biz.id, t.shift_id, t.date, t.type, t.payment_method, t.amount, t.fee, t.category_id, t.creditor_id, t.app_id, t.supplier, t.invoice_no, t.description, req.user.id);
  await saveItems(id, t.items);
  await audit(req.biz.id, req.user.id, 'tx_create', { id, after: await txSnap(t) });
  return id;
}

biz.post('/transactions', need('purchases_add', 'finance_manage'), wrap(async (req) => {
  const id = await db.tx(async () => insertTx(req, await validateTx(req, req.body || {})));
  return { id };
}));
// several invoices in one go (each saved separately) — all or nothing
biz.post('/transactions/batch', need('purchases_add', 'finance_manage'), wrap(async (req) => {
  const entries = Array.isArray(req.body?.entries) ? req.body.entries : [];
  if (!entries.length) bad('أدخل فاتورة واحدة على الأقل');
  if (entries.length > 100) bad('عدد الفواتير كبير جداً');
  const ids = await db.tx(async () => {
    const out = [];
    for (const [i, e] of entries.entries()) {
      try { out.push(await insertTx(req, await validateTx(req, e))); }
      catch (err) { if (err instanceof HttpError) throw new HttpError(err.status, 'الفاتورة {n}: {msg}', { n: i + 1, msg: err }); throw err; }
    }
    return out;
  });
  return { ids, total: r2(entries.reduce((t, e) => t + (num(e.amount) || 0), 0)) };
}));

async function getTx(req) {
  const t = await db.get('SELECT * FROM transactions WHERE id = ? AND business_id = ? AND deleted_at IS NULL', idOf(req.params.id), req.biz.id);
  if (!t) throw new HttpError(404, 'الحركة غير موجودة');
  return t;
}
// tx_edit may change anything (closed shifts are recalculated); a cashier may only fix own entries while the shift is open
async function canModify(req, t) {
  if (req.can('tx_edit')) return;
  const s = t.shift_id && await db.get('SELECT status FROM shifts WHERE id = ?', t.shift_id);
  if (t.created_by === req.user.id && s && s.status === 'open') return;
  throw new HttpError(403, 'ليس لديك صلاحية لتعديل هذه الحركة');
}
biz.put('/transactions/:id', wrap(async (req) => {
  const old = await getTx(req);
  await canModify(req, old);
  old.items = await loadItems(old.id);
  // items omitted → keep existing lines; items: [] → drop them and use the typed amount
  const body = { ...old, ...req.body };
  if (req.body?.items === undefined) body.items = old.items;
  const t = await validateTx(req, body, old);
  await db.tx(async () => {
    await db.run(`UPDATE transactions SET shift_id=?, date=?, type=?, payment_method=?, amount=?, fee=?, category_id=?, creditor_id=?, app_id=?, supplier=?, invoice_no=?, description=? WHERE id=?`,
      t.shift_id, t.date, t.type, t.payment_method, t.amount, t.fee, t.category_id, t.creditor_id, t.app_id, t.supplier, t.invoice_no, t.description, old.id);
    await saveItems(old.id, t.items);
    await recomputeShift(old.shift_id);
    if (t.shift_id !== old.shift_id) await recomputeShift(t.shift_id);
  });
  await audit(req.biz.id, req.user.id, 'tx_update', { id: old.id, before: await txSnap(old), after: await txSnap(t) });
  return { ok: true };
}));
biz.delete('/transactions/:id', wrap(async (req) => {
  const t = await getTx(req);
  await canModify(req, t);
  await db.tx(async () => {
    await db.run('UPDATE transactions SET deleted_at = ?, deleted_by = ? WHERE id = ?', nowLocal(), req.user.id, t.id);
    await recomputeShift(t.shift_id);
  });
  await audit(req.biz.id, req.user.id, 'tx_delete', { id: t.id, before: await txSnap(t) });
  return { ok: true };
}));

// ---------- edits log ----------
const EDIT_ACTIONS = ['tx_update', 'tx_delete', 'shift_edit', 'shift_reopen', 'cash_receive', 'settings_update', 'apps_update', 'categories_update', 'creditors_update', 'creditors_delete', 'logo_update'];
biz.get('/audit', need('audit_view'), wrap(async (req) => {
  const to = isDate(req.query.to) ? req.query.to : today();
  const from = isDate(req.query.from) ? req.query.from : addDays(to, -30);
  const where = ['a.business_id = ?', 'substr(a.created_at, 1, 10) BETWEEN ? AND ?'];
  const args = [req.biz.id, from, to];
  if (req.query.kind !== 'all') { where.push(`a.action IN (${EDIT_ACTIONS.map(() => '?').join(',')})`); args.push(...EDIT_ACTIONS); }
  if (idOf(req.query.user_id)) { where.push('a.user_id = ?'); args.push(idOf(req.query.user_id)); }
  const rows = await db.all(`SELECT a.*, u.name user_name FROM audit_log a LEFT JOIN users u ON u.id = a.user_id
    WHERE ${where.join(' AND ')} ORDER BY a.id DESC LIMIT 1000`, ...args);
  const users = await db.all('SELECT DISTINCT u.id, u.name FROM audit_log a JOIN users u ON u.id = a.user_id WHERE a.business_id = ? ORDER BY u.name', req.biz.id);
  return { rows: rows.map(r => ({ ...r, details: r.details ? JSON.parse(r.details) : null })), users, from, to };
}));

biz.get('/transactions', need('tx_view_all'), wrap(async (req) => {
  const from = isDate(req.query.from) ? req.query.from : today().slice(0, 8) + '01';
  const to = isDate(req.query.to) ? req.query.to : today();
  const where = ['t.business_id = ?', 't.date BETWEEN ? AND ?'];
  const args = [req.biz.id, from, to];
  if (req.query.deleted === '1') where.push('t.deleted_at IS NOT NULL'); else where.push('t.deleted_at IS NULL');
  if (req.query.type && TX_TYPES[req.query.type]) { where.push('t.type = ?'); args.push(req.query.type); }
  if (req.query.method && METHODS[req.query.method]) { where.push('t.payment_method = ?'); args.push(req.query.method); }
  if (idOf(req.query.category_id)) { where.push('t.category_id = ?'); args.push(idOf(req.query.category_id)); }
  if (idOf(req.query.creditor_id)) { where.push('t.creditor_id = ?'); args.push(idOf(req.query.creditor_id)); }
  if (req.query.q) { where.push('(t.supplier LIKE ? OR t.description LIKE ? OR t.invoice_no LIKE ?)'); const q = '%' + String(req.query.q).slice(0, 100) + '%'; args.push(q, q, q); }
  return attachItems(await db.all(`SELECT t.*, c.name category_name, cr.name creditor_name, a.name app_name, u.name created_by_name, ud.name deleted_by_name
    FROM transactions t LEFT JOIN categories c ON c.id = t.category_id LEFT JOIN creditors cr ON cr.id = t.creditor_id
    LEFT JOIN delivery_apps a ON a.id = t.app_id LEFT JOIN users u ON u.id = t.created_by LEFT JOIN users ud ON ud.id = t.deleted_by
    WHERE ${where.join(' AND ')} ORDER BY t.date DESC, t.id DESC LIMIT 2000`, ...args));
}));

// ---------- reports ----------
biz.get('/reports/daily', need('reports_view'), wrap(async (req) => {
  const b = req.biz;
  const date = isDate(req.query.date) ? req.query.date : today();
  const m = await movement(b, date, date);
  const prevBalance = await balanceAsOf(b, addDays(date, -1));
  const endBalance = await balanceAsOf(b, date);
  const receivables = await receivablesAsOf(b.id, date);
  const debts = await debtsAsOf(b.id, date);
  const shifts = await db.all(`SELECT s.*, uo.name opened_by_name, uc.name closed_by_name FROM shifts s LEFT JOIN users uo ON uo.id = s.opened_by
    LEFT JOIN users uc ON uc.id = s.closed_by WHERE s.business_id = ? AND s.date = ? ORDER BY s.id`, b.id, date);
  const txs = await db.all(`SELECT t.*, c.name category_name, cr.name creditor_name, a.name app_name, u.name created_by_name FROM transactions t
    LEFT JOIN categories c ON c.id = t.category_id LEFT JOIN creditors cr ON cr.id = t.creditor_id LEFT JOIN delivery_apps a ON a.id = t.app_id
    LEFT JOIN users u ON u.id = t.created_by WHERE t.business_id = ? AND t.date = ? AND t.deleted_at IS NULL ORDER BY t.id`, b.id, date);
  return {
    business: b.name, date, card_fee_pct: b.card_fee_pct, movement: m, prev_balance: prevBalance, end_balance: endBalance,
    receivables, debts, debts_day: await debtsPeriod(b.id, date, date), coverage: debts.total > 0 ? r2(endBalance / debts.total * 100) : null, net_position: r2(endBalance - debts.total),
    shifts, transactions: await attachItems(txs), open_shifts: shifts.filter(s => s.status === 'open').length,
  };
}));

biz.get('/reports/period', need('reports_view'), wrap(async (req) => {
  const b = req.biz;
  const to = isDate(req.query.to) ? req.query.to : today();
  const from = isDate(req.query.from) ? req.query.from : to.slice(0, 8) + '01';
  if (from > to) bad('تاريخ البداية بعد تاريخ النهاية');
  const m = await movement(b, from, to);
  const byCategory = await db.all(`SELECT t.type, COALESCE(c.name,'بدون تصنيف') name, SUM(t.amount) amount, COUNT(*) n FROM transactions t
    LEFT JOIN categories c ON c.id = t.category_id WHERE t.business_id = ? AND t.deleted_at IS NULL AND t.date BETWEEN ? AND ?
    AND t.type IN ('purchase','expense') GROUP BY t.type, c.id, c.name ORDER BY amount DESC`, b.id, from, to);
  const bySupplier = await db.all(`SELECT COALESCE(NULLIF(t.supplier,''), cr.name, 'غير محدد') name, SUM(t.amount) amount, COUNT(*) n FROM transactions t
    LEFT JOIN creditors cr ON cr.id = t.creditor_id WHERE t.business_id = ? AND t.deleted_at IS NULL AND t.date BETWEEN ? AND ? AND t.type = 'purchase'
    GROUP BY 1 ORDER BY amount DESC LIMIT 15`, b.id, from, to);
  const byCashier = await db.all(`SELECT u.name, COUNT(*) shifts, SUM(s.difference) diff, SUM(CASE WHEN s.difference < 0 THEN s.difference ELSE 0 END) shortage,
    SUM(CASE WHEN s.difference > 0 THEN s.difference ELSE 0 END) surplus, SUM(CASE WHEN s.counted_at IS NOT NULL AND s.difference = 0 THEN 1 ELSE 0 END) exact,
    SUM(CASE WHEN s.counted_at IS NULL THEN 1 ELSE 0 END) pending
    FROM shifts s LEFT JOIN users u ON u.id = s.closed_by WHERE s.business_id = ? AND s.status = 'closed' AND s.date BETWEEN ? AND ?
    GROUP BY s.closed_by, u.name ORDER BY diff`, b.id, from, to);
  const series = await dailySeries(b, from, to);
  const days = [...series.values()].filter(x => x.shifts || x.purchases || x.expenses).sort((a, c) => a.date < c.date ? -1 : 1)
    .map(({ shifts, ...x }) => x);
  return { business: b.name, from, to, movement: m, byCategory: byCategory.map(c => ({ ...c, amount: r2(c.amount) })),
    bySupplier: bySupplier.map(c => ({ ...c, amount: r2(c.amount) })), byCashier: byCashier.map(c => ({ ...c, diff: r2(c.diff), shortage: r2(c.shortage), surplus: r2(c.surplus) })),
    days, start_balance: await balanceAsOf(b, addDays(from, -1)), end_balance: await balanceAsOf(b, to), debts: await debtsPeriod(b.id, from, to) };
}));

biz.get('/balances', need('balance_view'), wrap(async (req) => ({
  balance: await balanceAsOf(req.biz, MAX_DATE), receivables: await receivablesAsOf(req.biz.id, MAX_DATE), debts: await debtsAsOf(req.biz.id, MAX_DATE),
})));

app.use('/api/b/:bid', biz);

// ───────────────────────── errors ─────────────────────────
app.use('/api', (req, res) => jerr(req, res, 404, 'غير موجود'));
app.use((err, req, res, next) => {
  if (err instanceof HttpError) return res.status(err.status).json({ error: tr(langOf(req), err.message, err.vars) });
  console.error(err);
  jerr(req, res, 500, 'حدث خطأ في الخادم');
});

// ───────────────────────── automatic daily backup (SQLite) ─────────────────────────
// one copy per day in <data>/backups/daily-YYYY-MM-DD.db, the last 30 are kept.
// (with PostgreSQL the database provider keeps the backups)
const KEEP_DAILY = 30;
async function dailyBackup() {
  try {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const file = path.join(BACKUP_DIR, `daily-${today()}.db`);
    if (!fs.existsSync(file)) { await db.backupFile(file); console.log('backup:', path.basename(file)); }
    const old = fs.readdirSync(BACKUP_DIR).filter(f => /^daily-\d{4}-\d{2}-\d{2}\.db$/.test(f)).sort().slice(0, -KEEP_DAILY);
    for (const f of old) fs.unlinkSync(path.join(BACKUP_DIR, f));
  } catch (e) { console.error('backup failed:', e.message); }
}

// ───────────────────────── start ─────────────────────────
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0'; // on a VPS: HOST=127.0.0.1 so only the HTTPS proxy can reach it
db.init().then(() => {
  if (db.dialect === 'sqlite' && !process.env.DB_PATH) { setTimeout(dailyBackup, 15e3); setInterval(dailyBackup, 3600e3); } // DB_PATH is only set by tests
  app.listen(PORT, HOST, () => {
    console.log(`\n  النظام يعمل الآن (${db.dialect === 'pg' ? 'PostgreSQL' : 'SQLite'}):`);
    console.log(`  على هذا الجهاز:   http://localhost:${PORT}`);
    for (const ifs of Object.values(os.networkInterfaces())) for (const i of ifs || [])
      if (i.family === 'IPv4' && !i.internal) console.log(`  من أجهزة الشبكة:  http://${i.address}:${PORT}`);
    console.log('');
  });
}).catch((e) => { console.error('database start failed:', e.message); process.exit(1); });
