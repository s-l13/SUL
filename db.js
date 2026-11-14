// ─────────────────────────────────────────────────────────────────────────────
//  Database layer — one async API over two engines:
//    • PostgreSQL  when DATABASE_URL is set   (cloud: Neon, Supabase, any Postgres)
//    • SQLite      otherwise                  (local / single server, file in DATA_DIR)
//
//  API (all async):  get(sql, ...p) → row | undefined     all(sql, ...p) → rows
//                    run(sql, ...p) → { changes }          insert(sql, ...p) → new id
//                    tx(async () => …)  — everything awaited inside runs in one transaction
//  SQL is written once with "?" placeholders; it is adapted to the engine here.
// ─────────────────────────────────────────────────────────────────────────────
const { AsyncLocalStorage } = require('async_hooks');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const PG = !!process.env.DATABASE_URL;
const als = new AsyncLocalStorage(); // holds the open transaction for the current request
const TZ = /^[A-Za-z_]+\/[A-Za-z_]+$/.test(process.env.TZ || '') ? process.env.TZ : 'Asia/Riyadh';

// DATA_DIR keeps the SQLite file (and its backups) outside the app folder if wanted
const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(__dirname, 'data');
const dbPath = process.env.DB_PATH || path.join(dataDir, 'shrakh.db');

let engine;

/* ───────────────────────────── PostgreSQL ───────────────────────────── */
if (PG) {
  const { Pool, types } = require('pg');
  types.setTypeParser(20, (v) => parseInt(v, 10));   // COUNT / BIGINT → number
  types.setTypeParser(1700, (v) => parseFloat(v));   // NUMERIC (SUM of integers) → number
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: Number(process.env.PG_POOL || 5), idleTimeoutMillis: 30000 });
  pool.on('error', (e) => console.error('postgres pool error:', e.message));
  // "?" → $1, $2 … (outside quoted strings); SQLite's case-insensitive LIKE → ILIKE
  const adapt = (sql) => {
    let n = 0, out = '', q = false;
    for (const ch of sql) { if (ch === "'") q = !q; out += !q && ch === '?' ? '$' + (++n) : ch; }
    return out.replace(/\bLIKE\b/g, 'ILIKE');
  };
  const exec = (sql, params) => (als.getStore()?.client || pool).query(adapt(sql), params);
  engine = {
    dialect: 'pg',
    get: async (sql, ...p) => (await exec(sql, p)).rows[0],
    all: async (sql, ...p) => (await exec(sql, p)).rows,
    run: async (sql, ...p) => ({ changes: (await exec(sql, p)).rowCount }),
    insert: async (sql, ...p) => (await exec(sql + ' RETURNING id', p)).rows[0].id,
    exec: (sql) => (als.getStore()?.client || pool).query(sql),
    async tx(fn) {
      if (als.getStore()) return fn(); // already inside a transaction
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const out = await als.run({ client }, fn);
        await client.query('COMMIT');
        return out;
      } catch (e) { await client.query('ROLLBACK').catch(() => { }); throw e; }
      finally { client.release(); }
    },
    close: () => pool.end(),
  };
}

/* ───────────────────────────── SQLite ───────────────────────────── */
else {
  const Database = require('better-sqlite3');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  // one connection: transactions run strictly one after another (a queue), and queries from other
  // requests wait for the queue, so nothing ever slips into someone else's open transaction
  let queue = Promise.resolve();
  const wait = () => (als.getStore() ? null : queue);
  engine = {
    dialect: 'sqlite',
    get: async (sql, ...p) => { await wait(); return db.prepare(sql).get(...p); },
    all: async (sql, ...p) => { await wait(); return db.prepare(sql).all(...p); },
    run: async (sql, ...p) => { await wait(); return { changes: db.prepare(sql).run(...p).changes }; },
    insert: async (sql, ...p) => { await wait(); return Number(db.prepare(sql).run(...p).lastInsertRowid); },
    exec: async (sql) => { await wait(); db.exec(sql); },
    tx(fn) {
      if (als.getStore()) return fn(); // already inside a transaction
      const run = queue.then(async () => {
        db.exec('BEGIN IMMEDIATE');
        try { const out = await als.run({ tx: true }, fn); db.exec('COMMIT'); return out; }
        catch (e) { db.exec('ROLLBACK'); throw e; }
      });
      queue = run.catch(() => { }); // the next transaction starts only after this one ends
      return run;
    },
    backupFile: (file) => db.backup(file), // consistent copy of the whole database
    raw: db,
    close: () => db.close(),
  };
}

/* ───────────────────────────── schema ───────────────────────────── */
// written once; types and defaults are swapped per engine
// local time as text (same format the app uses); the zone is fixed in the default so no session setting is needed
const NOW = PG ? `to_char(now() AT TIME ZONE '${TZ}', 'YYYY-MM-DD HH24:MI:SS')` : "(datetime('now','localtime'))";
const ID = PG ? 'INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY' : 'INTEGER PRIMARY KEY';
const REAL = PG ? 'DOUBLE PRECISION' : 'REAL';
const BIG = PG ? 'BIGINT' : 'INTEGER';
const SCHEMA = `
CREATE TABLE IF NOT EXISTS businesses (
  id ${ID}, name TEXT NOT NULL,
  card_fee_pct ${REAL} NOT NULL DEFAULT 0, cash_float ${REAL} NOT NULL DEFAULT 0, opening_balance ${REAL} NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT ${NOW},
  cashier_counts INTEGER NOT NULL DEFAULT 0, cash_count INTEGER NOT NULL DEFAULT 0, day_start_hour INTEGER NOT NULL DEFAULT 5, open_time TEXT, close_time TEXT, kind TEXT NOT NULL DEFAULT 'restaurant',
  logo TEXT, logo_updated TEXT, theme TEXT
);
CREATE TABLE IF NOT EXISTS users (
  id ${ID}, username TEXT NOT NULL, name TEXT NOT NULL, password_hash TEXT NOT NULL,
  is_admin INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT ${NOW},
  must_change INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_users_username ON users (lower(username));
CREATE TABLE IF NOT EXISTS user_business (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  permissions TEXT NOT NULL DEFAULT '[]',
  PRIMARY KEY (user_id, business_id)
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at ${BIG} NOT NULL
);
CREATE TABLE IF NOT EXISTS delivery_apps (
  id ${ID}, business_id INTEGER NOT NULL REFERENCES businesses(id), name TEXT NOT NULL,
  opening_receivable ${REAL} NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS categories (
  id ${ID}, business_id INTEGER NOT NULL REFERENCES businesses(id),
  kind TEXT NOT NULL CHECK (kind IN ('purchase','expense')), name TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS creditors (
  id ${ID}, business_id INTEGER NOT NULL REFERENCES businesses(id), name TEXT NOT NULL,
  opening_balance ${REAL} NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1, deleted_at TEXT
);
CREATE TABLE IF NOT EXISTS shifts (
  id ${ID}, business_id INTEGER NOT NULL REFERENCES businesses(id), date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  opening_float ${REAL} NOT NULL DEFAULT 0, opened_by INTEGER REFERENCES users(id), opened_at TEXT NOT NULL DEFAULT ${NOW},
  closed_by INTEGER REFERENCES users(id), closed_at TEXT,
  cash_sales ${REAL} NOT NULL DEFAULT 0, card_sales ${REAL} NOT NULL DEFAULT 0, app_sales ${REAL} NOT NULL DEFAULT 0,
  orders_count INTEGER NOT NULL DEFAULT 0, card_fee ${REAL} NOT NULL DEFAULT 0,
  counted_cash ${REAL} NOT NULL DEFAULT 0, cash_with_staff ${REAL} NOT NULL DEFAULT 0,
  expected_cash ${REAL} NOT NULL DEFAULT 0, difference ${REAL} NOT NULL DEFAULT 0, notes TEXT,
  counted_by INTEGER, counted_at TEXT, act_cash ${REAL}, act_card ${REAL}
);
CREATE TABLE IF NOT EXISTS shift_app_sales (
  shift_id INTEGER NOT NULL REFERENCES shifts(id) ON DELETE CASCADE, app_id INTEGER NOT NULL REFERENCES delivery_apps(id),
  amount ${REAL} NOT NULL DEFAULT 0, orders_count INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (shift_id, app_id)
);
CREATE TABLE IF NOT EXISTS transactions (
  id ${ID}, business_id INTEGER NOT NULL REFERENCES businesses(id), shift_id INTEGER REFERENCES shifts(id),
  date TEXT NOT NULL, type TEXT NOT NULL, payment_method TEXT NOT NULL DEFAULT 'company',
  amount ${REAL} NOT NULL, fee ${REAL} NOT NULL DEFAULT 0, card_part ${REAL} NOT NULL DEFAULT 0,
  category_id INTEGER REFERENCES categories(id), creditor_id INTEGER REFERENCES creditors(id), app_id INTEGER REFERENCES delivery_apps(id),
  supplier TEXT, invoice_no TEXT, description TEXT,
  created_by INTEGER REFERENCES users(id), created_at TEXT NOT NULL DEFAULT ${NOW},
  deleted_at TEXT, deleted_by INTEGER REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS ix_tx_bdate ON transactions(business_id, date);
CREATE INDEX IF NOT EXISTS ix_tx_shift ON transactions(shift_id);
CREATE INDEX IF NOT EXISTS ix_tx_creditor ON transactions(creditor_id);
CREATE INDEX IF NOT EXISTS ix_shift_bdate ON shifts(business_id, date);
CREATE TABLE IF NOT EXISTS tx_items (
  id ${ID}, transaction_id INTEGER NOT NULL REFERENCES transactions(id), name TEXT NOT NULL,
  qty ${REAL} NOT NULL DEFAULT 1, price ${REAL} NOT NULL DEFAULT 0, total ${REAL} NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS ix_items_tx ON tx_items(transaction_id);
CREATE TABLE IF NOT EXISTS audit_log (
  id ${ID}, business_id INTEGER, user_id INTEGER, action TEXT NOT NULL, details TEXT, created_at TEXT NOT NULL DEFAULT ${NOW}
);
CREATE INDEX IF NOT EXISTS ix_audit_biz ON audit_log(business_id, created_at);
-- ── family fund (a business of kind 'fund') ──
CREATE TABLE IF NOT EXISTS fund_settings (
  business_id INTEGER PRIMARY KEY REFERENCES businesses(id), start_month TEXT NOT NULL, due_day INTEGER NOT NULL DEFAULT 27,
  loan_multiplier ${REAL} NOT NULL DEFAULT 2, opening_balance ${REAL} NOT NULL DEFAULT 0,
  show_names INTEGER NOT NULL DEFAULT 0, show_borrowers INTEGER NOT NULL DEFAULT 0, motto TEXT, statement_month TEXT, impact_page TEXT
);
CREATE TABLE IF NOT EXISTS fund_categories (
  id ${ID}, business_id INTEGER NOT NULL REFERENCES businesses(id), name TEXT NOT NULL, amount ${REAL} NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS fund_members (
  id ${ID}, business_id INTEGER NOT NULL REFERENCES businesses(id), name TEXT NOT NULL, parent_id INTEGER,
  user_id INTEGER REFERENCES users(id), category_id INTEGER REFERENCES fund_categories(id), contributing INTEGER NOT NULL DEFAULT 1,
  join_month TEXT, left_month TEXT, guardian_access INTEGER NOT NULL DEFAULT 1, notes TEXT, deceased INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT ${NOW}, deleted_at TEXT, spouse_id INTEGER, mother_id INTEGER, guardian_act INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS ix_fmem_biz ON fund_members(business_id);
CREATE TABLE IF NOT EXISTS fund_rates (
  id ${ID}, member_id INTEGER NOT NULL REFERENCES fund_members(id), from_month TEXT NOT NULL, amount ${REAL} NOT NULL, created_at TEXT NOT NULL DEFAULT ${NOW}
);
CREATE INDEX IF NOT EXISTS ix_frate_mem ON fund_rates(member_id);
CREATE TABLE IF NOT EXISTS fund_loans (
  id ${ID}, business_id INTEGER NOT NULL REFERENCES businesses(id), member_id INTEGER NOT NULL REFERENCES fund_members(id),
  amount ${REAL} NOT NULL, installment ${REAL} NOT NULL, start_month TEXT NOT NULL, issued_date TEXT NOT NULL,
  anonymous INTEGER NOT NULL DEFAULT 0, note TEXT, created_by INTEGER REFERENCES users(id), created_at TEXT NOT NULL DEFAULT ${NOW}, deleted_at TEXT
);
CREATE TABLE IF NOT EXISTS fund_payments (
  id ${ID}, business_id INTEGER NOT NULL REFERENCES businesses(id), member_id INTEGER NOT NULL REFERENCES fund_members(id),
  month TEXT NOT NULL, kind TEXT NOT NULL CHECK (kind IN ('dues','installment')), loan_id INTEGER REFERENCES fund_loans(id),
  amount ${REAL} NOT NULL, note TEXT, created_by INTEGER REFERENCES users(id), created_at TEXT NOT NULL DEFAULT ${NOW},
  deleted_at TEXT, deleted_by INTEGER REFERENCES users(id), for_month TEXT, extra INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS ix_fpay_biz ON fund_payments(business_id, month);
CREATE TABLE IF NOT EXISTS fund_loan_requests (
  id ${ID}, business_id INTEGER NOT NULL REFERENCES businesses(id), member_id INTEGER NOT NULL REFERENCES fund_members(id),
  requested_by INTEGER REFERENCES users(id), amount ${REAL} NOT NULL, months INTEGER NOT NULL, reason TEXT, anonymous INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
  over_limit INTEGER NOT NULL DEFAULT 0, flagged INTEGER NOT NULL DEFAULT 0,
  decided_by INTEGER REFERENCES users(id), decided_at TEXT, decision_note TEXT, loan_id INTEGER REFERENCES fund_loans(id),
  created_at TEXT NOT NULL DEFAULT ${NOW}
);
CREATE INDEX IF NOT EXISTS ix_freq_biz ON fund_loan_requests(business_id, status);
-- a member asks to see the fund report with everyone's names; the supervisor grants it for some days
CREATE TABLE IF NOT EXISTS fund_report_requests (
  id ${ID}, business_id INTEGER NOT NULL REFERENCES businesses(id), user_id INTEGER NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')), expires_on TEXT,
  decided_by INTEGER REFERENCES users(id), decided_at TEXT, created_at TEXT NOT NULL DEFAULT ${NOW}
);
CREATE TABLE IF NOT EXISTS fund_banners (
  id ${ID}, business_id INTEGER NOT NULL REFERENCES businesses(id), title TEXT, body TEXT, color TEXT NOT NULL DEFAULT 'brand',
  image TEXT, active INTEGER NOT NULL DEFAULT 1, sort INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT ${NOW}, layout TEXT
);
-- goals of the fund (a campaign with gifts, or a target on the balance / total collected / number of contributors)
CREATE TABLE IF NOT EXISTS fund_goals (
  id ${ID}, business_id INTEGER NOT NULL REFERENCES businesses(id), title TEXT NOT NULL, description TEXT, kind TEXT NOT NULL DEFAULT 'campaign',
  target ${REAL} NOT NULL DEFAULT 0, emoji TEXT, color TEXT NOT NULL DEFAULT 'sunset', deadline TEXT, active INTEGER NOT NULL DEFAULT 1,
  sort INTEGER NOT NULL DEFAULT 0, done_at TEXT, deleted_at TEXT, created_at TEXT NOT NULL DEFAULT ${NOW}
);
CREATE TABLE IF NOT EXISTS fund_goal_gifts (
  id ${ID}, business_id INTEGER NOT NULL REFERENCES businesses(id), goal_id INTEGER NOT NULL REFERENCES fund_goals(id), member_id INTEGER,
  donor TEXT, amount ${REAL} NOT NULL, date TEXT NOT NULL, note TEXT, created_by INTEGER, deleted_at TEXT, created_at TEXT NOT NULL DEFAULT ${NOW}
);
-- in-app notifications (bell): one row per recipient
CREATE TABLE IF NOT EXISTS notifications (
  id ${ID}, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, business_id INTEGER, kind TEXT NOT NULL,
  title TEXT NOT NULL, vars TEXT, link TEXT, read_at TEXT, created_at TEXT NOT NULL DEFAULT ${NOW}
);
CREATE INDEX IF NOT EXISTS ix_notif_user ON notifications(user_id, read_at);
CREATE TABLE IF NOT EXISTS snapshots (
  id ${ID}, label TEXT NOT NULL, data TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT ${NOW}
);`;
// every table, parents before children (used by export / copy / reset)
const TABLES = ['businesses', 'users', 'user_business', 'sessions', 'delivery_apps', 'categories', 'creditors', 'shifts', 'shift_app_sales', 'transactions', 'tx_items', 'audit_log',
  'fund_settings', 'fund_categories', 'fund_members', 'fund_rates', 'fund_loans', 'fund_payments', 'fund_loan_requests', 'fund_banners', 'fund_report_requests', 'fund_goals', 'fund_goal_gifts', 'notifications'];

// SQLite files created by earlier versions: add the columns that came later
async function migrateSqlite() {
  const db = engine.raw;
  const addCol = (table, col, def) => {
    if (!db.prepare(`PRAGMA table_info(${table})`).all().some(c => c.name === col)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
  };
  // tables from an old file are created by SCHEMA only if missing, so check columns first
  if (db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='businesses'").get()) {
    addCol('shifts', 'counted_by', 'INTEGER');
    addCol('shifts', 'counted_at', 'TEXT');
    addCol('shifts', 'act_cash', 'REAL');
    addCol('shifts', 'act_card', 'REAL');
    addCol('businesses', 'cashier_counts', 'INTEGER NOT NULL DEFAULT 0');
    addCol('businesses', 'cash_count', 'INTEGER NOT NULL DEFAULT 0');
    if (db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='transactions'").get()) addCol('transactions', 'card_part', 'REAL NOT NULL DEFAULT 0');
    addCol('businesses', 'day_start_hour', 'INTEGER NOT NULL DEFAULT 5');
    addCol('businesses', 'logo', 'TEXT');
    addCol('businesses', 'logo_updated', 'TEXT');
    addCol('businesses', 'theme', 'TEXT');
    addCol('businesses', 'open_time', 'TEXT');
    addCol('businesses', 'close_time', 'TEXT');
    addCol('businesses', 'kind', "TEXT NOT NULL DEFAULT 'restaurant'");
    if (db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='fund_members'").get()) { addCol('fund_members', 'deceased', 'INTEGER NOT NULL DEFAULT 0'); addCol('fund_members', 'spouse_id', 'INTEGER'); addCol('fund_members', 'mother_id', 'INTEGER'); addCol('fund_members', 'guardian_act', 'INTEGER NOT NULL DEFAULT 0'); }
    if (db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='fund_payments'").get()) { addCol('fund_payments', 'for_month', 'TEXT'); addCol('fund_payments', 'extra', 'INTEGER NOT NULL DEFAULT 0'); }
    if (db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='fund_banners'").get()) addCol('fund_banners', 'layout', 'TEXT');
    if (db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='fund_settings'").get()) { addCol('fund_settings', 'show_names', 'INTEGER NOT NULL DEFAULT 0'); addCol('fund_settings', 'show_borrowers', 'INTEGER NOT NULL DEFAULT 0'); addCol('fund_settings', 'motto', 'TEXT'); addCol('fund_settings', 'statement_month', 'TEXT'); addCol('fund_settings', 'impact_page', 'TEXT'); }
    addCol('creditors', 'deleted_at', 'TEXT');
    addCol('users', 'must_change', 'INTEGER NOT NULL DEFAULT 0');
  }
}

const DEFAULT_CATEGORIES = {
  purchase: ['خضار وفواكه', 'لحوم ودواجن', 'مواد غذائية', 'مشروبات', 'تغليف ومستهلكات', 'غاز', 'أخرى'],
  expense: ['رواتب', 'إيجار', 'كهرباء ومياه', 'صيانة', 'تسويق', 'رسوم حكومية', 'نثريات', 'أخرى'],
};
async function seedBusinessDefaults(businessId, apps) {
  for (const kind of Object.keys(DEFAULT_CATEGORIES))
    for (const name of DEFAULT_CATEGORIES[kind]) await engine.run('INSERT INTO categories (business_id, kind, name) VALUES (?,?,?)', businessId, kind, name);
  for (const a of apps || ['هنقرستيشن', 'جاهز', 'كيتا', 'تويو']) await engine.run('INSERT INTO delivery_apps (business_id, name) VALUES (?,?)', businessId, a);
}

// create tables, upgrade old files, and on the very first run create the admin + a first business
async function init() {
  if (!PG) await migrateSqlite();
  await engine.exec(SCHEMA);
  // PostgreSQL databases created by earlier versions: add the columns that came later
  if (PG) await engine.exec('ALTER TABLE businesses ADD COLUMN IF NOT EXISTS open_time TEXT; ALTER TABLE businesses ADD COLUMN IF NOT EXISTS close_time TEXT; ALTER TABLE businesses ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT \'restaurant\'; ALTER TABLE businesses ADD COLUMN IF NOT EXISTS cash_count INTEGER NOT NULL DEFAULT 0; ALTER TABLE transactions ADD COLUMN IF NOT EXISTS card_part DOUBLE PRECISION NOT NULL DEFAULT 0; ALTER TABLE shifts ADD COLUMN IF NOT EXISTS act_cash DOUBLE PRECISION; ALTER TABLE shifts ADD COLUMN IF NOT EXISTS act_card DOUBLE PRECISION; ALTER TABLE fund_members ADD COLUMN IF NOT EXISTS deceased INTEGER NOT NULL DEFAULT 0; ALTER TABLE fund_members ADD COLUMN IF NOT EXISTS spouse_id INTEGER; ALTER TABLE fund_members ADD COLUMN IF NOT EXISTS mother_id INTEGER; ALTER TABLE fund_members ADD COLUMN IF NOT EXISTS guardian_act INTEGER NOT NULL DEFAULT 0; ALTER TABLE fund_payments ADD COLUMN IF NOT EXISTS for_month TEXT; ALTER TABLE fund_payments ADD COLUMN IF NOT EXISTS extra INTEGER NOT NULL DEFAULT 0; ALTER TABLE fund_banners ADD COLUMN IF NOT EXISTS layout TEXT; ALTER TABLE fund_settings ADD COLUMN IF NOT EXISTS show_names INTEGER NOT NULL DEFAULT 0; ALTER TABLE fund_settings ADD COLUMN IF NOT EXISTS show_borrowers INTEGER NOT NULL DEFAULT 0; ALTER TABLE fund_settings ADD COLUMN IF NOT EXISTS motto TEXT; ALTER TABLE fund_settings ADD COLUMN IF NOT EXISTS statement_month TEXT; ALTER TABLE fund_settings ADD COLUMN IF NOT EXISTS impact_page TEXT;');
  const { c } = await engine.get('SELECT COUNT(*) c FROM users');
  if (c === 0) {
    await engine.tx(async () => {
      await engine.run('INSERT INTO users (username, name, password_hash, is_admin, must_change) VALUES (?,?,?,1,1)', 'admin', 'المدير', bcrypt.hashSync('admin123', 10));
      const bid = await engine.insert('INSERT INTO businesses (name, card_fee_pct, cash_float) VALUES (?,?,?)', 'النشاط الأول', 0.92, 200);
      await seedBusinessDefaults(bid);
    });
    console.log('تم إنشاء حساب المدير: admin / admin123  (سيُطلب تغيير كلمة المرور عند أول دخول)');
  }
}

// whole database as JSON — engine independent (download / snapshot / move between engines)
async function exportAll() {
  const out = { format: 'daily-closing', version: 1, exported_at: new Date().toISOString(), engine: engine.dialect, tables: {} };
  for (const t of [...TABLES, 'snapshots']) out.tables[t] = t === 'snapshots' ? [] : await engine.all(`SELECT * FROM ${t}`);
  return out;
}

module.exports = { ...engine, db: engine, init, seedBusinessDefaults, exportAll, TABLES, dataDir, dbPath, PG };
