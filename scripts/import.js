// ─────────────────────────────────────────────────────────────────────────────
//  Copy ALL data into the database this app is configured for.
//  Source: a SQLite file (data/shrakh.db) or a JSON backup downloaded from the app.
//  Target: PostgreSQL if DATABASE_URL is set, otherwise the local SQLite file.
//
//    Windows (PowerShell):
//      $env:DATABASE_URL="postgres://…"; node scripts/import.js data/shrakh.db --replace
//    Linux / macOS:
//      DATABASE_URL="postgres://…" node scripts/import.js backup.json --replace
//
//  --replace  is required when the target already has data: it wipes the target first.
//  IDs are kept exactly, so everything stays linked; nothing is changed in the source.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

const [, , src, ...flags] = process.argv;
const replace = flags.includes('--replace');
if (!src || !fs.existsSync(src)) { console.error('usage: node scripts/import.js <file.db | backup.json> [--replace]'); process.exit(1); }

function readSource(file) {
  if (file.toLowerCase().endsWith('.json')) {
    const j = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (j.format !== 'daily-closing') throw new Error('not a backup made by this app');
    return j.tables;
  }
  const Database = require('better-sqlite3');
  const s = new Database(file, { readonly: true, fileMustExist: true });
  const out = {};
  for (const t of require('../db').TABLES) {
    const exists = s.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(t);
    out[t] = exists ? s.prepare(`SELECT * FROM ${t}`).all() : [];
  }
  s.close();
  return out;
}

(async () => {
  const tables = readSource(path.resolve(src));
  const db = require('../db');
  await db.init();
  const { TABLES } = db;
  const has = (await db.get('SELECT COUNT(*) n FROM transactions')).n + (await db.get('SELECT COUNT(*) n FROM shifts')).n;
  if (has && !replace) { console.error(`the target already has data (${has} rows). Add --replace to overwrite it.`); process.exit(1); }

  await db.tx(async () => {
    // empty the target (children first), then copy parents first
    for (const t of [...TABLES].reverse()) await db.run(`DELETE FROM ${t}`);
    for (const t of TABLES) {
      const rows = tables[t] || [];
      for (const r of rows) {
        const cols = Object.keys(r);
        await db.run(`INSERT INTO ${t} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`, ...cols.map(c => r[c]));
      }
      console.log(`${t.padEnd(16)} ${rows.length}`);
    }
    // PostgreSQL: continue new ids after the highest copied id
    const NO_ID = ['user_business', 'sessions', 'shift_app_sales', 'fund_settings'];
    if (db.dialect === 'pg') for (const t of TABLES.filter(x => !NO_ID.includes(x)))
      await db.run(`SELECT setval(pg_get_serial_sequence('${t}', 'id'), (SELECT COALESCE(MAX(id), 0) + 1 FROM ${t}), false)`);
  });
  console.log(`\nDone ✔  copied into ${db.dialect === 'pg' ? 'PostgreSQL' : 'SQLite'}`);
  await db.close();
})().catch((e) => { console.error('import failed:', e.message); process.exit(1); });
