// ───────────────────────── family fund ─────────────────────────
// A business of kind 'fund': members in a family tree, monthly dues (with partial payments and arrears),
// monthly collection, commitment rates and loans with installments. Fully separate from the restaurant pages.
//
// How a month is judged: payments are applied to the oldest unpaid month first. A month is "paid" when,
// by the end of that month, everything due up to it was covered. Missing it after the month ended is a default
// (paying the arrears later reduces what is owed but the late month stays counted as late).

const FUND_PERMS = {
  fund_collect: 'تسجيل الدفعات الشهرية (المحصّل)',
  fund_view_all: 'رؤية التزام جميع الأعضاء والتقارير الكاملة',
  fund_manage: 'إدارة الصندوق (الأعضاء، الشجرة، المبالغ، القروض، الإعدادات)',
};
const FUND_EDIT_ACTIONS = ['fund_impact_page', 'fund_goal_update', 'fund_goal_delete', 'fund_gift_delete', 'fund_payment_delete', 'fund_member_update', 'fund_member_delete', 'fund_rate', 'fund_settings', 'fund_category_update', 'fund_loan_update', 'fund_loan_delete', 'fund_account_password'];

const crypto = require('crypto');
// a fixed but meaningless order for hidden names, so 'member 3' cannot be matched with the 3rd name in the tree
const shuffleKey = (bid, id, salt) => crypto.createHash('sha256').update(bid + ':' + id + ':' + salt).digest('hex');
const isMonth = (s) => typeof s === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
const prevMonth = (m) => { let [y, mo] = m.split('-').map(Number); if (--mo < 1) { mo = 12; y--; } return `${y}-${String(mo).padStart(2, '0')}`; };
const receiptNo = (id) => 'R-' + String(id).padStart(6, '0');
const nextMonth = (m) => { let [y, mo] = m.split('-').map(Number); if (++mo > 12) { mo = 1; y++; } return `${y}-${String(mo).padStart(2, '0')}`; };
const monthsBetween = (a, b) => { const out = []; for (let m = a; m <= b && out.length < 1200; m = nextMonth(m)) out.push(m); return out; };
const sum = (list, f) => list.reduce((t, x) => t + (f ? f(x) : x), 0);
const groupBy = (list, k) => { const m = new Map(); for (const x of list) { if (!m.has(x[k])) m.set(x[k], []); m.get(x[k]).push(x); } return m; };

function rating(c) {
  if (c === null) return 'new';
  if (c >= 0.95) return 'excellent';
  if (c >= 0.8) return 'good';
  if (c >= 0.6) return 'irregular';
  return 'follow';
}

module.exports = function mountFund(app, biz, ctx) {
  const { db, wrap, need, bad, HttpError, audit, r2, num, idOf, today, bcrypt, PW_MIN, DEFAULT_PASSWORD } = ctx;
  const cur = () => today().slice(0, 7);
  const viewAll = (req) => req.can('fund_view_all') || req.can('fund_manage');

  // every /fund route works only on a fund business
  biz.use('/fund', (req, res, next) => req.biz.kind === 'fund' ? next() : next(new HttpError(404, 'غير موجود')));

  async function load(bid) {
    const settings = await db.get('SELECT * FROM fund_settings WHERE business_id = ?', bid);
    const [categories, members, rates, payments, loans] = await Promise.all([
      db.all('SELECT * FROM fund_categories WHERE business_id = ? ORDER BY active DESC, id', bid),
      db.all('SELECT * FROM fund_members WHERE business_id = ? AND deleted_at IS NULL ORDER BY id', bid),
      db.all('SELECT r.* FROM fund_rates r JOIN fund_members m ON m.id = r.member_id WHERE m.business_id = ? ORDER BY r.from_month, r.id', bid),
      db.all('SELECT * FROM fund_payments WHERE business_id = ? AND deleted_at IS NULL ORDER BY month, id', bid),
      db.all('SELECT * FROM fund_loans WHERE business_id = ? AND deleted_at IS NULL ORDER BY issued_date, id', bid),
    ]);
    return { settings, categories, members, rates, payments, loans };
  }

  // one member's dues month by month
  function memberLedger(m, rates, pays, start, now) {
    const from = m.join_month && m.join_month > start ? m.join_month : start;
    const months = from <= now ? monthsBetween(from, now) : [];
    const rateAt = (mo) => { let a = 0; for (const r of rates) if (r.from_month <= mo) a = r.amount; return a; };
    const allDues = pays.filter(p => p.kind === 'dues');
    const dues = allDues.filter(p => !p.extra); // an extra (voluntary) contribution never pays a month
    const dueOf = (mo) => m.contributing && (!m.left_month || mo <= m.left_month) ? rateAt(mo) : 0;
    // a payment the collector tied to a month (for_month) covers that month; all other money (and any excess)
    // fills the oldest unpaid months first — so a month paid late counts as paid, and the months not chosen stay late
    const inRange = new Set(months), tied = new Map(), tiedOnTime = new Map(), freeIn = new Map(), shown = new Map();
    for (const p of dues) {
      shown.set(p.month, (shown.get(p.month) || 0) + p.amount);
      let free = p.amount;
      if (p.for_month && inRange.has(p.for_month)) {
        const t = Math.min(free, Math.max(0, dueOf(p.for_month) - (tied.get(p.for_month) || 0)));
        tied.set(p.for_month, (tied.get(p.for_month) || 0) + t); free -= t;
        if (p.month === p.for_month) tiedOnTime.set(p.month, (tiedOnTime.get(p.month) || 0) + t);
      }
      if (free > 0.0001) freeIn.set(p.month, (freeIn.get(p.month) || 0) + free);
    }
    // paid = the money recorded so far covers it (oldest first); on time = it was covered by money paid by the end of that month
    let pool = sum([...freeIn.values()]), cumDue = 0, cumPaid = sum([...freeIn].filter(([mo]) => mo < from), ([, v]) => v);
    const list = months.map(mo => {
      const due = dueOf(mo), fixed = tied.get(mo) || 0;
      const paid = shown.get(mo) || 0;
      const take = Math.min(due - fixed, Math.max(0, pool)); pool -= take;
      const covered = fixed + take;
      const prev = cumDue; cumDue += due - fixed; cumPaid += freeIn.get(mo) || 0;
      const onTime = (tiedOnTime.get(mo) || 0) + Math.min(due - fixed, Math.max(0, cumPaid - prev));
      const status = due <= 0 ? 'none' : covered >= due - 0.005 ? (onTime >= due - 0.005 || mo >= now ? 'full' : 'late') : mo === now ? 'open' : covered > 0.005 ? 'partial' : 'missed';
      return { m: mo, due: r2(due), paid: r2(paid), covered: r2(covered), status };
    });
    const closed = list.filter(x => x.m < now && x.due > 0);
    const dueClosed = sum(closed, x => x.due), coveredClosed = sum(closed, x => x.covered);
    let run = 0, maxRun = 0;
    const paidUp = (x) => x.status === 'full' || x.status === 'late'; // a month paid late still counts as paid
    for (const x of closed) { run = paidUp(x) ? 0 : run + 1; maxRun = Math.max(maxRun, run); }
    const late = closed.filter(x => !paidUp(x)).length;
    const totalPaid = sum(allDues, p => p.amount), extraPaid = sum(allDues.filter(p => p.extra), p => p.amount);
    const commitment = dueClosed > 0 ? coveredClosed / dueClosed : null;
    const curRow = list.find(x => x.m === now);
    return {
      months: list.map(x => { const ex = r2(sum(allDues.filter(p => p.extra && p.month === x.m), p => p.amount)); return { ...x, extra: ex, paid: r2(x.paid + ex) }; }),
      // money paid ahead: recorded dues not yet used by any month
      credit: r2(Math.max(0, (totalPaid - extraPaid) - sum(list, x => x.covered))),
      monthly: r2(rateAt(now)), total_paid: r2(totalPaid), extra_paid: r2(extraPaid),
      arrears: r2(Math.max(0, sum(list.filter(x => x.m < now), x => x.due) - (totalPaid - extraPaid))),
      this_month: curRow ? { due: curRow.due, paid: curRow.paid, remaining: r2(Math.max(0, curRow.due - curRow.covered)), status: curRow.status } : null,
      due_closed: r2(dueClosed), covered_closed: r2(coveredClosed),
      commitment: commitment === null ? null : Math.round(commitment * 1000) / 10,
      late_months: late, current_run: run, max_run: maxRun, rating: rating(commitment),
      flagged: maxRun >= 3 || late >= 5,
    };
  }

  function loanLedger(l, pays, now) {
    const own = pays.filter(p => p.kind === 'installment' && p.loan_id === l.id);
    const paid = sum(own, p => p.amount);
    const before = l.start_month <= now ? monthsBetween(l.start_month, now).filter(m => m < now).length : 0;
    const expectedPrev = Math.min(l.amount, l.installment * before);
    const remaining = Math.max(0, l.amount - paid);
    return {
      ...l, paid: r2(paid), remaining: r2(remaining), paid_pct: l.amount ? Math.round(paid / l.amount * 1000) / 10 : 0,
      arrears: r2(Math.max(0, expectedPrev - paid)), status: remaining <= 0.005 ? 'paid' : 'active',
    };
  }

  function compute(d) {
    const now = cur(), start = d.settings.start_month;
    const ratesBy = groupBy(d.rates, 'member_id'), paysBy = groupBy(d.payments, 'member_id');
    const members = d.members.map(m => ({ ...m, ...memberLedger(m, ratesBy.get(m.id) || [], paysBy.get(m.id) || [], start, now) }));
    const loans = d.loans.map(l => ({ ...loanLedger(l, d.payments, now), member_name: d.members.find(m => m.id === l.member_id)?.name || '' }));
    const duesTotal = sum(d.payments.filter(p => p.kind === 'dues'), p => p.amount);
    const instTotal = sum(d.payments.filter(p => p.kind === 'installment'), p => p.amount);
    const issued = sum(d.loans, l => l.amount);
    for (const m of members) m.share = duesTotal ? Math.round(m.total_paid / duesTotal * 1000) / 10 : 0;
    const contributors = members.filter(m => m.contributing && !(m.left_month && m.left_month < now));
    const dueAll = sum(members, m => m.due_closed), covAll = sum(members, m => m.covered_closed);
    const months = start <= now ? monthsBetween(start, now) : [];
    let cumIn = 0, bal = d.settings.opening_balance;
    const series = months.map(mo => {
      const inc = sum(d.payments.filter(p => p.month === mo), p => p.amount);
      const out = sum(d.loans.filter(l => l.issued_date.slice(0, 7) === mo), l => l.amount);
      cumIn += inc; bal += inc - out;
      return { m: mo, income: r2(inc), loans: r2(out), collected: r2(cumIn), balance: r2(bal) };
    });
    const totals = {
      collected: r2(duesTotal), installments: r2(instTotal), loans_issued: r2(issued), loans_count: d.loans.length,
      loans_outstanding: r2(sum(loans, l => l.remaining)), balance: r2(d.settings.opening_balance + duesTotal + instTotal - issued),
      contributors: contributors.length, months: months.length,
      collection_rate: dueAll ? Math.round(covAll / dueAll * 1000) / 10 : null,
      excellent: contributors.filter(m => m.rating === 'excellent').length,
      follow: contributors.filter(m => ['irregular', 'follow'].includes(m.rating)).length,
      this_month_unpaid: contributors.filter(m => m.this_month && m.this_month.remaining > 0.005).length,
    };
    return { now, members, loans, totals, series };
  }

  // the members this user may look at without "view all": their own record + children they guard
  function mine(req, members) {
    const own = members.filter(m => m.user_id === req.user.id);
    const ids = new Set(own.map(m => m.id));
    const kids = members.filter(m => (ids.has(m.parent_id) || ids.has(m.mother_id)) && m.guardian_access && !ids.has(m.id));
    return [...own.map(m => ({ ...m, relation: 'self' })), ...kids.map(m => ({ ...m, relation: 'child' }))];
  }
  const loanLimit = (m, s) => r2(m.total_paid * s.loan_multiplier);

  biz.get('/fund/overview', wrap(async (req) => {
    const d = await load(req.biz.id);
    const c = compute(d);
    const settings = { ...d.settings, name: req.biz.name };
    const my = mine(req, c.members).map(m => ({ ...m, loans: c.loans.filter(l => l.member_id === m.id), loan_limit: loanLimit(m, d.settings) }));
    const banners = await db.all('SELECT id, title, body, color, image, layout FROM fund_banners WHERE business_id = ? AND active = 1 ORDER BY sort, id', req.biz.id);
    const pending = viewAll(req) ? (await db.get("SELECT COUNT(*) n FROM fund_loan_requests WHERE business_id = ? AND status = 'pending'", req.biz.id)).n : undefined;
    if (viewAll(req)) return { full: true, settings, categories: d.categories, members: c.members, loans: c.loans, totals: c.totals, series: c.series, now: c.now, mine: my, banners, pending_requests: pending };
    // ordinary member: own figures + fund totals; others appear by name only (family tree)
    return { full: false, settings, totals: c.totals, series: c.series, now: c.now, mine: my, banners,
      tree: c.members.map(m => ({ id: m.id, name: m.name, parent_id: m.parent_id, spouse_id: m.spouse_id, mother_id: m.mother_id, contributing: m.contributing, deceased: m.deceased })) };
  }));

  // monthly collection sheet: what each member owes this month (dues + loan installment) and what was paid
  biz.get('/fund/collect', need('fund_collect', 'fund_view_all', 'fund_manage'), wrap(async (req) => {
    const d = await load(req.biz.id);
    const now = cur();
    const M = isMonth(req.query.month) && req.query.month <= now ? req.query.month : now;
    const c = compute(d);
    const names = new Map(d.members.map(m => [m.id, m.name]));
    const rows = [];
    for (const m of c.members) {
      const pays = d.payments.filter(p => p.member_id === m.id);
      const idx = m.months.findIndex(x => x.m === M);
      const dueM = idx >= 0 ? m.months[idx].due : 0;
      const duePrev = sum(m.months.filter(x => x.m < M), x => x.due);
      const paidPrev = sum(pays.filter(p => p.kind === 'dues' && !p.extra && p.month < M), p => p.amount);
      const dues = { due: dueM, arrears: r2(Math.max(0, duePrev - paidPrev)), required: r2(Math.max(0, dueM + duePrev - paidPrev)),
        paid: r2(sum(pays.filter(p => p.kind === 'dues' && !p.extra && p.month === M), p => p.amount)), payments: pays.filter(p => p.kind === 'dues' && p.month === M),
        extra: r2(sum(pays.filter(p => p.kind === 'dues' && p.extra && p.month === M), p => p.amount)),
        open_months: m.months.filter(x => x.m <= M && x.due - x.covered > 0.005).map(x => ({ m: x.m, left: r2(x.due - x.covered) })) };
      const loans = d.loans.filter(l => l.member_id === m.id && l.start_month <= M && l.issued_date.slice(0, 7) <= M).map(l => {
        const lp = pays.filter(p => p.kind === 'installment' && p.loan_id === l.id);
        const paidBefore = sum(lp.filter(p => p.month < M), p => p.amount);
        const expected = Math.min(l.amount, l.installment * monthsBetween(l.start_month, M).length);
        return { id: l.id, amount: l.amount, installment: l.installment, required: r2(Math.max(0, Math.min(expected, l.amount) - paidBefore)),
          paid: r2(sum(lp.filter(p => p.month === M), p => p.amount)), remaining: r2(Math.max(0, l.amount - sum(lp, p => p.amount))), payments: lp.filter(p => p.month === M) };
      }).filter(l => l.required > 0.005 || l.paid > 0);
      const active = m.contributing && (!m.left_month || m.left_month >= M) && (!m.join_month || m.join_month <= M);
      if (!active && !loans.length && !dues.paid && dues.required <= 0.005) continue;
      rows.push({ id: m.id, name: m.name, parent: names.get(m.parent_id) || '', dues, loans,
        done: dues.paid >= dues.required - 0.005 && loans.every(l => l.paid >= l.required - 0.005) });
    }
    return { month: M, now, start: d.settings.start_month, rows,
      totals: { required: r2(sum(rows, r => r.dues.required + sum(r.loans, l => l.required))), paid: r2(sum(rows, r => r.dues.paid + sum(r.loans, l => l.paid))), open: rows.filter(r => !r.done).length } };
  }));

  biz.post('/fund/payments', need('fund_collect', 'fund_manage'), wrap(async (req) => {
    const x = req.body || {};
    const s = await db.get('SELECT * FROM fund_settings WHERE business_id = ?', req.biz.id);
    const m = await db.get('SELECT * FROM fund_members WHERE id = ? AND business_id = ? AND deleted_at IS NULL', idOf(x.member_id), req.biz.id);
    if (!m) bad('العضو غير موجود');
    if (!isMonth(x.month) || x.month > cur() || x.month < s.start_month) bad('الشهر غير صحيح');
    const amount = num(x.amount);
    if (!(amount > 0)) bad('المبلغ يجب أن يكون أكبر من صفر');
    const kind = x.kind === 'installment' ? 'installment' : 'dues';
    let loan_id = null;
    if (kind === 'installment') {
      const l = await db.get('SELECT * FROM fund_loans WHERE id = ? AND member_id = ? AND deleted_at IS NULL', idOf(x.loan_id), m.id);
      if (!l) bad('القرض غير موجود');
      const paid = (await db.get("SELECT COALESCE(SUM(amount),0) v FROM fund_payments WHERE loan_id = ? AND deleted_at IS NULL", l.id)).v;
      if (amount > l.amount - paid + 0.005) bad('المبلغ أكبر من المتبقي من القرض ({remaining})', { remaining: r2(l.amount - paid).toFixed(2) });
      loan_id = l.id;
    }
    // dues paid short: the collector may say which months this money is for — the others stay late (one receipt per month)
    // part (or all) of the money as an extra contribution: raises the member's total (and loan right), pays no month
    const extra = kind === 'dues' && x.extra !== undefined && x.extra !== '' && x.extra !== null ? r2(num(x.extra)) : 0;
    if (!(extra >= 0) || extra > r2(amount) + 0.005) bad('المساهمة الإضافية يجب أن تكون بين صفر والمبلغ المدفوع');
    const dueAmount = r2(amount - extra);
    let parts = dueAmount > 0.005 ? [{ for_month: null, amount: dueAmount }] : [];
    if (kind === 'dues' && dueAmount > 0.005 && Array.isArray(x.months) && x.months.length) {
      if (x.months.length > 120) bad('عدد الشهور كبير جداً');
      const cm = compute(await load(req.biz.id)).members.find(q => q.id === m.id);
      const left = new Map((cm ? cm.months : []).map(q => [q.m, r2(q.due - q.covered)]));
      let rest = dueAmount; parts = [];
      for (const mo of [...new Set(x.months.map(String))].sort()) {
        if (!isMonth(mo) || mo > x.month || !(left.get(mo) > 0.005)) bad('لا يوجد مبلغ مستحق في شهر {month}', { month: mo });
        if (rest <= 0.005) break;
        const a = r2(Math.min(rest, left.get(mo)));
        parts.push({ for_month: mo, amount: a }); rest = r2(rest - a);
      }
      if (rest > 0.005) parts.push({ for_month: null, amount: rest });
    }
    if (extra > 0.005) parts.push({ for_month: null, amount: extra, extra: 1 });
    const note = String(x.note || '').trim().slice(0, 300) || null;
    const ids = await db.tx(async () => {
      const out = [];
      for (const pt of parts) out.push(await db.insert('INSERT INTO fund_payments (business_id, member_id, month, kind, loan_id, amount, note, created_by, for_month, extra) VALUES (?,?,?,?,?,?,?,?,?,?)',
        req.biz.id, m.id, x.month, kind, loan_id, pt.amount, note, req.user.id, pt.for_month, pt.extra || 0));
      return out;
    });
    for (const [i, id] of ids.entries()) {
      const pt = parts[i];
      await audit(req.biz.id, req.user.id, 'fund_payment', { id, member: m.name, month: x.month, kind: pt.extra ? 'extra' : kind, amount: pt.amount, ...(pt.for_month ? { for_month: pt.for_month } : {}) });
      await receiptNotice(req, m, { id, month: pt.for_month || x.month, kind, amount: pt.amount });
    }
    return { id: ids[0], no: receiptNo(ids[0]), ids, nos: ids.map(receiptNo) };
  }));
  biz.delete('/fund/payments/:id', need('fund_collect', 'fund_manage'), wrap(async (req) => {
    const p = await db.get('SELECT p.*, m.name member FROM fund_payments p JOIN fund_members m ON m.id = p.member_id WHERE p.id = ? AND p.business_id = ? AND p.deleted_at IS NULL', idOf(req.params.id), req.biz.id);
    if (!p) throw new HttpError(404, 'غير موجود');
    if (!req.can('fund_manage') && p.created_by !== req.user.id) throw new HttpError(403, 'يمكنك حذف الدفعات التي سجلتها أنت فقط');
    await db.run('UPDATE fund_payments SET deleted_at = ?, deleted_by = ? WHERE id = ?', ctx.nowLocal(), req.user.id, p.id);
    await audit(req.biz.id, req.user.id, 'fund_payment_delete', { before: { member: p.member, month: p.month, kind: p.kind, amount: p.amount } });
    return { ok: true };
  }));

  // one member in detail (self / guarded child / anyone for supervisors)
  biz.get('/fund/members/:id', wrap(async (req) => {
    const d = await load(req.biz.id);
    const c = compute(d);
    const id = idOf(req.params.id);
    const m = viewAll(req) ? c.members.find(x => x.id === id) : mine(req, c.members).find(x => x.id === id);
    if (!m) throw new HttpError(404, 'غير موجود');
    const users = await db.all('SELECT id, name FROM users');
    return { ...m, loan_limit: loanLimit(m, d.settings), loans: c.loans.filter(l => l.member_id === m.id),
      payments: d.payments.filter(p => p.member_id === m.id).reverse().map(p => ({ ...p, by: users.find(u => u.id === p.created_by)?.name || '' })),
      rates: d.rates.filter(r => r.member_id === m.id),
      username: m.user_id ? (await db.get('SELECT username FROM users WHERE id = ?', m.user_id))?.username : null };
  }));

  // ── members & family tree (fund_manage) ──
  async function checkParent(req, parentId, selfId) {
    if (!parentId) return null;
    const all = await db.all('SELECT id, parent_id FROM fund_members WHERE business_id = ? AND deleted_at IS NULL', req.biz.id);
    if (!all.some(x => x.id === parentId)) bad('الأب / الأم غير موجود');
    for (let p = parentId, i = 0; p && i < 500; i++) { if (p === selfId) bad('لا يمكن أن يكون العضو أباً لنفسه أو لأحد آبائه'); p = all.find(x => x.id === p)?.parent_id; }
    return parentId;
  }
  // a wife / mother is linked to her husband (spouse_id) and stands beside him in the tree; a child may name
  // the mother (mother_id) among the wives of the father. A wife has no father link of her own here.
  async function checkFamily(req, x, selfId, parent, sent) {
    const all = await db.all('SELECT id, parent_id, spouse_id FROM fund_members WHERE business_id = ? AND deleted_at IS NULL', req.biz.id);
    const spouse = idOf(x.spouse_id) || null;
    if (spouse) {
      const h = all.find(m => m.id === spouse);
      if (!h || spouse === selfId) bad('الزوج غير موجود');
      if (h.spouse_id) bad('اختر الزوج (رب الأسرة) وليس زوجة أخرى');
      if (selfId && all.some(m => m.spouse_id === selfId)) bad('هذا العضو له زوجة في الشجرة — لا يمكن جعله زوجة');
      for (let p = spouse, i = 0; p && i < 500; i++) { if (p === selfId) bad('لا يمكن أن يكون الزوج من أبناء العضو نفسه'); p = all.find(m => m.id === p)?.parent_id; }
      return { parent_id: null, spouse_id: spouse, mother_id: null };
    }
    let mother = idOf(x.mother_id) || null;
    if (mother) {
      const w = all.find(m => m.id === mother);
      if (!w || !parent || w.spouse_id !== parent) { if (sent) bad('الأم يجب أن تكون زوجة للأب المختار'); mother = null; }
    }
    return { parent_id: parent, spouse_id: null, mother_id: mother };
  }
  const snapMember = async (id) => {
    const m = await db.get('SELECT * FROM fund_members WHERE id = ?', id);
    const nameOf = async (k) => k ? (await db.get('SELECT name FROM fund_members WHERE id = ?', k))?.name || '' : '';
    const par = m.parent_id && await db.get('SELECT name FROM fund_members WHERE id = ?', m.parent_id);
    const cat = m.category_id && await db.get('SELECT name FROM fund_categories WHERE id = ?', m.category_id);
    return { name: m.name, parent: par?.name || '', ...(m.spouse_id ? { spouse: await nameOf(m.spouse_id) } : {}), ...(m.mother_id ? { mother: await nameOf(m.mother_id) } : {}), category: cat?.name || '', contributing: m.contributing, deceased: m.deceased, join_month: m.join_month || '', left_month: m.left_month || '', guardian_access: m.guardian_access, guardian_act: m.guardian_act ? 1 : 0, notes: m.notes || '' };
  };
  biz.post('/fund/members', need('fund_manage'), wrap(async (req) => {
    const x = req.body || {};
    const s = await db.get('SELECT * FROM fund_settings WHERE business_id = ?', req.biz.id);
    const name = String(x.name || '').trim().slice(0, 100);
    if (!name) bad('الاسم مطلوب');
    const fam = await checkFamily(req, x, 0, await checkParent(req, idOf(x.parent_id), 0), true);
    const contributing = x.contributing === false || x.contributing === 0 || x.contributing === '0' ? 0 : 1;
    const cat = idOf(x.category_id) && await db.get('SELECT * FROM fund_categories WHERE id = ? AND business_id = ?', idOf(x.category_id), req.biz.id);
    const join = isMonth(x.join_month) ? x.join_month : (s.start_month > cur() ? s.start_month : cur());
    let amount = x.amount === undefined || x.amount === '' || x.amount === null ? (cat ? cat.amount : NaN) : num(x.amount);
    if (contributing && !(amount >= 0)) bad('حدد فئة الاشتراك أو المبلغ الشهري');
    const id = await db.tx(async () => {
      const follow = x.guardian_access === false || x.guardian_access === 0 ? 0 : 1;
      const mid = await db.insert('INSERT INTO fund_members (business_id, name, parent_id, spouse_id, mother_id, category_id, contributing, join_month, guardian_access, guardian_act, notes, deceased) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
        req.biz.id, name, fam.parent_id, fam.spouse_id, fam.mother_id, cat ? cat.id : null, contributing, join, follow, follow && x.guardian_act && x.guardian_act !== '0' ? 1 : 0, String(x.notes || '').slice(0, 500) || null, x.deceased ? 1 : 0);
      if (contributing) await db.insert('INSERT INTO fund_rates (member_id, from_month, amount) VALUES (?,?,?)', mid, join, r2(amount));
      return mid;
    });
    await audit(req.biz.id, req.user.id, 'fund_member_create', { after: await snapMember(id) });
    return { id };
  }));
  biz.put('/fund/members/:id', need('fund_manage'), wrap(async (req) => {
    const m = await db.get('SELECT * FROM fund_members WHERE id = ? AND business_id = ? AND deleted_at IS NULL', idOf(req.params.id), req.biz.id);
    if (!m) throw new HttpError(404, 'غير موجود');
    const x = { ...m, ...(req.body || {}) };
    const name = String(x.name || '').trim().slice(0, 100);
    if (!name) bad('الاسم مطلوب');
    const fam = await checkFamily(req, x, m.id, await checkParent(req, idOf(x.parent_id), m.id), req.body && 'mother_id' in req.body);
    const cat = idOf(x.category_id) && await db.get('SELECT id FROM fund_categories WHERE id = ? AND business_id = ?', idOf(x.category_id), req.biz.id);
    if (x.join_month && !isMonth(x.join_month)) bad('شهر الانضمام غير صحيح');
    if (x.left_month && !isMonth(x.left_month)) bad('شهر الخروج غير صحيح');
    const before = await snapMember(m.id);
    const flag = (v) => v === false || v === 0 || v === '0' ? 0 : 1;
    // acting in the child's name (loan requests) is a separate approval, and needs following on
    const act = flag(x.guardian_access) && x.guardian_act && x.guardian_act !== '0' ? 1 : 0;
    await db.run('UPDATE fund_members SET name=?, parent_id=?, spouse_id=?, mother_id=?, category_id=?, contributing=?, join_month=?, left_month=?, guardian_access=?, guardian_act=?, notes=?, deceased=? WHERE id=?',
      name, fam.parent_id, fam.spouse_id, fam.mother_id, cat ? cat.id : null, flag(x.contributing), x.join_month || null, x.left_month || null, flag(x.guardian_access), act, String(x.notes || '').slice(0, 500) || null, x.deceased && x.deceased !== '0' ? 1 : 0, m.id);
    // a member who starts contributing needs a monthly amount
    if (flag(x.contributing) && !(await db.get('SELECT 1 x FROM fund_rates WHERE member_id = ?', m.id))) {
      const c = cat && await db.get('SELECT amount FROM fund_categories WHERE id = ?', cat.id);
      await db.insert('INSERT INTO fund_rates (member_id, from_month, amount) VALUES (?,?,?)', m.id, x.join_month || cur(), c ? c.amount : 0);
    }
    await audit(req.biz.id, req.user.id, 'fund_member_update', { before, after: await snapMember(m.id) });
    return { ok: true };
  }));
  biz.delete('/fund/members/:id', need('fund_manage'), wrap(async (req) => {
    const m = await db.get('SELECT * FROM fund_members WHERE id = ? AND business_id = ? AND deleted_at IS NULL', idOf(req.params.id), req.biz.id);
    if (!m) throw new HttpError(404, 'غير موجود');
    if (await db.get('SELECT 1 x FROM fund_payments WHERE member_id = ? AND deleted_at IS NULL', m.id) || await db.get('SELECT 1 x FROM fund_loans WHERE member_id = ? AND deleted_at IS NULL', m.id))
      bad('لا يمكن حذف عضو له دفعات أو قروض — حدّد «شهر الخروج» بدلاً من ذلك');
    if (await db.get('SELECT 1 x FROM fund_members WHERE parent_id = ? AND deleted_at IS NULL', m.id)) bad('لا يمكن حذف عضو له أبناء في الشجرة — انقل الأبناء أولاً');
    if (await db.get('SELECT 1 x FROM fund_members WHERE spouse_id = ? AND deleted_at IS NULL', m.id)) bad('لا يمكن حذف عضو له زوجة في الشجرة — احذف الزوجة أو عدّلها أولاً');
    const before = await snapMember(m.id);
    await db.run('UPDATE fund_members SET deleted_at = ?, user_id = NULL WHERE id = ?', ctx.nowLocal(), m.id);
    await db.run('UPDATE fund_members SET mother_id = NULL WHERE mother_id = ?', m.id);
    await audit(req.biz.id, req.user.id, 'fund_member_delete', { before });
    return { ok: true };
  }));
  // change the monthly amount from a given month (earlier months keep their old amount)
  biz.post('/fund/members/:id/rate', need('fund_manage'), wrap(async (req) => {
    const m = await db.get('SELECT * FROM fund_members WHERE id = ? AND business_id = ? AND deleted_at IS NULL', idOf(req.params.id), req.biz.id);
    if (!m) throw new HttpError(404, 'غير موجود');
    const amount = num(req.body?.amount), from = req.body?.from_month;
    if (!(amount >= 0)) bad('المبلغ غير صحيح');
    if (!isMonth(from)) bad('الشهر غير صحيح');
    const old = await db.all('SELECT from_month, amount FROM fund_rates WHERE member_id = ? ORDER BY from_month, id', m.id);
    const before = old.filter(r => r.from_month <= from).pop()?.amount ?? 0;
    await db.tx(async () => {
      await db.run('DELETE FROM fund_rates WHERE member_id = ? AND from_month = ?', m.id, from);
      await db.insert('INSERT INTO fund_rates (member_id, from_month, amount) VALUES (?,?,?)', m.id, from, r2(amount));
    });
    await audit(req.biz.id, req.user.id, 'fund_rate', { member: m.name, from_month: from, before: { monthly: before }, after: { monthly: r2(amount) } });
    return { ok: true };
  }));

  // ── member login accounts (created by the fund manager; scoped to this fund only) ──
  biz.post('/fund/members/:id/account', need('fund_manage'), wrap(async (req) => {
    const m = await db.get('SELECT * FROM fund_members WHERE id = ? AND business_id = ? AND deleted_at IS NULL', idOf(req.params.id), req.biz.id);
    if (!m) throw new HttpError(404, 'غير موجود');
    if (m.user_id) bad('لهذا العضو حساب دخول بالفعل');
    const username = String(req.body?.username || '').trim(), password = String(req.body?.password || '');
    if (!/^[A-Za-z0-9._-]{3,40}$/.test(username)) bad('اسم الدخول: حروف إنجليزية وأرقام فقط (3 أحرف على الأقل)');
    if (password.length < PW_MIN) bad('كلمة المرور يجب أن تكون {n} أحرف على الأقل', { n: PW_MIN });
    if (password === DEFAULT_PASSWORD) bad('اختر كلمة مرور غير الافتراضية');
    if (await db.get('SELECT 1 x FROM users WHERE lower(username) = lower(?)', username)) bad('اسم المستخدم مستخدم مسبقاً');
    const uid = await db.tx(async () => {
      const u = await db.insert('INSERT INTO users (username, name, password_hash, is_admin, must_change) VALUES (?,?,?,0,0)', username, m.name, bcrypt.hashSync(password, 10));
      await db.run('INSERT INTO user_business (user_id, business_id, permissions) VALUES (?,?,?)', u, req.biz.id, '[]');
      await db.run('UPDATE fund_members SET user_id = ? WHERE id = ?', u, m.id);
      return u;
    });
    await audit(req.biz.id, req.user.id, 'fund_account_create', { member: m.name, username });
    return { id: uid };
  }));
  // accounts that can be linked to a member: the owner sees every account; a fund supervisor sees the accounts of this fund
  biz.get('/fund/accounts', need('fund_manage'), wrap(async (req) => {
    const linked = new Set((await db.all('SELECT user_id FROM fund_members WHERE business_id = ? AND deleted_at IS NULL AND user_id IS NOT NULL', req.biz.id)).map(r => r.user_id));
    const rows = req.user.is_admin
      ? await db.all('SELECT id, username, name FROM users WHERE active = 1 ORDER BY name')
      : await db.all('SELECT u.id, u.username, u.name FROM users u JOIN user_business ub ON ub.user_id = u.id WHERE ub.business_id = ? AND u.active = 1 ORDER BY u.name', req.biz.id);
    return rows.filter(u => !linked.has(u.id)).map(u => ({ username: u.username, name: u.name }));
  }));
  // link a member to an account that already exists (e.g. the owner, a supervisor, or someone with another account)
  biz.post('/fund/members/:id/link', need('fund_manage'), wrap(async (req) => {
    const m = await db.get('SELECT * FROM fund_members WHERE id = ? AND business_id = ? AND deleted_at IS NULL', idOf(req.params.id), req.biz.id);
    if (!m) throw new HttpError(404, 'غير موجود');
    if (m.user_id) bad('لهذا العضو حساب دخول بالفعل');
    const username = String(req.body?.username || '').trim();
    const u = username && await db.get('SELECT id, username, name, is_admin, active FROM users WHERE lower(username) = lower(?)', username);
    if (!u || !u.active) bad('لا يوجد حساب بهذا الاسم');
    const access = await db.get('SELECT 1 x FROM user_business WHERE user_id = ? AND business_id = ?', u.id, req.biz.id);
    // a supervisor (not the owner) may only link accounts that already belong to this fund
    if (!req.user.is_admin && !access) bad('لا يوجد حساب بهذا الاسم');
    const other = await db.get('SELECT name FROM fund_members WHERE business_id = ? AND user_id = ? AND deleted_at IS NULL', req.biz.id, u.id);
    if (other) bad('هذا الحساب مرتبط بالعضو {name}', { name: other.name });
    await db.tx(async () => {
      if (!access && !u.is_admin) await db.run('INSERT INTO user_business (user_id, business_id, permissions) VALUES (?,?,?)', u.id, req.biz.id, '[]');
      await db.run('UPDATE fund_members SET user_id = ? WHERE id = ?', u.id, m.id);
    });
    await audit(req.biz.id, req.user.id, 'fund_account_link', { member: m.name, username: u.username });
    return { ok: true, username: u.username, name: u.name };
  }));
  // unlink: the account stays (it may be used elsewhere); a plain member account loses access to this fund
  biz.post('/fund/members/:id/unlink', need('fund_manage'), wrap(async (req) => {
    const m = await db.get('SELECT * FROM fund_members WHERE id = ? AND business_id = ? AND deleted_at IS NULL', idOf(req.params.id), req.biz.id);
    if (!m || !m.user_id) bad('لا يوجد حساب دخول لهذا العضو');
    const u = await db.get('SELECT id, username FROM users WHERE id = ?', m.user_id);
    await db.tx(async () => {
      await db.run('UPDATE fund_members SET user_id = NULL WHERE id = ?', m.id);
      await db.run("DELETE FROM user_business WHERE user_id = ? AND business_id = ? AND (permissions = '[]' OR permissions IS NULL)", m.user_id, req.biz.id);
    });
    await audit(req.biz.id, req.user.id, 'fund_account_unlink', { member: m.name, username: u?.username || '' });
    return { ok: true };
  }));
  // reset a member's password — only for plain member accounts of this fund (never an admin or another business's user)
  biz.post('/fund/members/:id/password', need('fund_manage'), wrap(async (req) => {
    const m = await db.get('SELECT * FROM fund_members WHERE id = ? AND business_id = ? AND deleted_at IS NULL', idOf(req.params.id), req.biz.id);
    if (!m || !m.user_id) bad('لا يوجد حساب دخول لهذا العضو');
    const u = await db.get('SELECT * FROM users WHERE id = ?', m.user_id);
    const access = await db.all('SELECT business_id FROM user_business WHERE user_id = ?', u.id);
    if (u.is_admin || access.some(a => a.business_id !== req.biz.id) || u.id === req.user.id)
      throw new HttpError(403, 'هذا الحساب له صلاحيات أخرى — يغيّر كلمة مروره مالك النظام فقط');
    const password = String(req.body?.password || '');
    if (password.length < PW_MIN) bad('كلمة المرور يجب أن تكون {n} أحرف على الأقل', { n: PW_MIN });
    await db.run('UPDATE users SET password_hash = ?, must_change = 0 WHERE id = ?', bcrypt.hashSync(password, 10), u.id);
    await db.run('DELETE FROM sessions WHERE user_id = ?', u.id);
    await audit(req.biz.id, req.user.id, 'fund_account_password', { member: m.name, username: u.username });
    return { ok: true };
  }));

  // ── subscription categories (e.g. employee 50 / not employed 10) ──
  biz.post('/fund/categories', need('fund_manage'), wrap(async (req) => {
    const name = String(req.body?.name || '').trim().slice(0, 60), amount = num(req.body?.amount);
    if (!name) bad('الاسم مطلوب');
    if (!(amount >= 0)) bad('المبلغ غير صحيح');
    const id = await db.insert('INSERT INTO fund_categories (business_id, name, amount) VALUES (?,?,?)', req.biz.id, name, r2(amount));
    await audit(req.biz.id, req.user.id, 'fund_category_create', { after: { name, amount: r2(amount) } });
    return { id };
  }));
  // changing a category's amount from a month applies it to every member of that category from that month
  biz.put('/fund/categories/:id', need('fund_manage'), wrap(async (req) => {
    const c = await db.get('SELECT * FROM fund_categories WHERE id = ? AND business_id = ?', idOf(req.params.id), req.biz.id);
    if (!c) throw new HttpError(404, 'غير موجود');
    const x = req.body || {};
    const name = String(x.name ?? c.name).trim().slice(0, 60), amount = x.amount === undefined ? c.amount : num(x.amount);
    if (!name) bad('الاسم مطلوب');
    if (!(amount >= 0)) bad('المبلغ غير صحيح');
    let applied = 0;
    await db.tx(async () => {
      await db.run('UPDATE fund_categories SET name = ?, amount = ?, active = ? WHERE id = ?', name, r2(amount), x.active === undefined ? c.active : (x.active ? 1 : 0), c.id);
      if (Math.abs(amount - c.amount) > 0.005 && isMonth(x.apply_from)) {
        const ms = await db.all('SELECT id FROM fund_members WHERE category_id = ? AND deleted_at IS NULL AND contributing = 1 AND (left_month IS NULL OR left_month >= ?)', c.id, x.apply_from);
        for (const m of ms) {
          await db.run('DELETE FROM fund_rates WHERE member_id = ? AND from_month = ?', m.id, x.apply_from);
          await db.insert('INSERT INTO fund_rates (member_id, from_month, amount) VALUES (?,?,?)', m.id, x.apply_from, r2(amount));
        }
        applied = ms.length;
      }
    });
    await audit(req.biz.id, req.user.id, 'fund_category_update', { before: { name: c.name, amount: c.amount }, after: { name, amount: r2(amount), apply_from: x.apply_from || '', members: applied } });
    return { ok: true, applied };
  }));

  biz.put('/fund/settings', need('fund_manage'), wrap(async (req) => {
    const s = await db.get('SELECT * FROM fund_settings WHERE business_id = ?', req.biz.id);
    const x = req.body || {};
    const name = String(x.name ?? req.biz.name).trim().slice(0, 100);
    if (!name) bad('اسم الصندوق مطلوب');
    const after = {
      start_month: x.start_month === undefined ? s.start_month : (isMonth(x.start_month) ? x.start_month : bad('شهر البداية غير صحيح')),
      due_day: x.due_day === undefined ? s.due_day : Math.min(28, Math.max(1, parseInt(x.due_day) || 1)),
      loan_multiplier: x.loan_multiplier === undefined ? s.loan_multiplier : (num(x.loan_multiplier) > 0 ? r2(num(x.loan_multiplier)) : bad('مضاعف حد القرض غير صحيح')),
      opening_balance: x.opening_balance === undefined ? s.opening_balance : (Number.isFinite(num(x.opening_balance)) ? r2(num(x.opening_balance)) : bad('الرصيد الافتتاحي غير صحيح')),
      show_names: x.show_names === undefined ? s.show_names : (x.show_names && x.show_names !== '0' ? 1 : 0),
      show_borrowers: x.show_borrowers === undefined ? s.show_borrowers : (x.show_borrowers && x.show_borrowers !== '0' ? 1 : 0),
      motto: x.motto === undefined ? s.motto : (String(x.motto).trim().slice(0, 200) || null),
    };
    await db.tx(async () => {
      await db.run('UPDATE businesses SET name = ? WHERE id = ?', name, req.biz.id);
      await db.run('UPDATE fund_settings SET start_month=?, due_day=?, loan_multiplier=?, opening_balance=?, show_names=?, show_borrowers=?, motto=? WHERE business_id=?', after.start_month, after.due_day, after.loan_multiplier, after.opening_balance, after.show_names, after.show_borrowers, after.motto, req.biz.id);
    });
    await audit(req.biz.id, req.user.id, 'fund_settings', { before: { name: req.biz.name, ...Object.fromEntries(Object.keys(after).map(k => [k, s[k]])) }, after: { name, ...after } });
    return { ok: true };
  }));

  // ── loans (recorded by the manager; requests from members come in the next stage) ──
  biz.post('/fund/loans', need('fund_manage'), wrap(async (req) => ({ id: await issueLoan(req, req.body || {}) })));
  async function issueLoan(req, x) {
    const d = await load(req.biz.id);
    const c = compute(d);
    const m = c.members.find(y => y.id === idOf(x.member_id));
    if (!m) bad('العضو غير موجود');
    const amount = num(x.amount), installment = num(x.installment);
    if (!(amount > 0)) bad('مبلغ القرض يجب أن يكون أكبر من صفر');
    if (!(installment > 0) || installment > amount) bad('القسط الشهري غير صحيح');
    const issued = ctx.isDate(x.issued_date) ? x.issued_date : today();
    if (issued > today()) bad('تاريخ الصرف لا يمكن أن يكون في المستقبل');
    const start = isMonth(x.start_month) ? x.start_month : nextMonth(issued.slice(0, 7));
    if (start < issued.slice(0, 7)) bad('بداية الأقساط قبل تاريخ الصرف');
    const limit = loanLimit(m, d.settings);
    if (amount > limit + 0.005 && !x.override) bad('المبلغ يتجاوز الحد المسموح لهذا العضو ({limit})', { limit: limit.toFixed(2) });
    const prepaid = x.prepaid === undefined || x.prepaid === '' ? 0 : num(x.prepaid);
    if (!(prepaid >= 0) || prepaid > amount) bad('المسدد سابقاً غير صحيح');
    // an old loan is checked against the balance it had when issued: the amount already repaid came back into the fund
    if (amount - prepaid > c.totals.balance + 0.005) bad('رصيد الصندوق لا يكفي ({balance})', { balance: c.totals.balance.toFixed(2) });
    const id = await db.tx(async () => {
      const lid = await db.insert('INSERT INTO fund_loans (business_id, member_id, amount, installment, start_month, issued_date, anonymous, note, created_by) VALUES (?,?,?,?,?,?,?,?,?)',
        req.biz.id, m.id, r2(amount), r2(installment), start, issued, x.anonymous ? 1 : 0, String(x.note || '').slice(0, 500) || null, req.user.id);
      if (prepaid > 0) await db.insert('INSERT INTO fund_payments (business_id, member_id, month, kind, loan_id, amount, note, created_by) VALUES (?,?,?,?,?,?,?,?)',
        req.biz.id, m.id, start <= cur() ? start : cur(), 'installment', lid, r2(prepaid), 'مسدد قبل النظام', req.user.id);
      return lid;
    });
    await audit(req.biz.id, req.user.id, 'fund_loan_create', { after: { member: m.name, amount: r2(amount), installment: r2(installment), start_month: start, issued_date: issued, prepaid: prepaid || undefined, over_limit: amount > limit + 0.005 ? limit : undefined } });
    return id;
  }
  biz.put('/fund/loans/:id', need('fund_manage'), wrap(async (req) => {
    const l = await db.get('SELECT * FROM fund_loans WHERE id = ? AND business_id = ? AND deleted_at IS NULL', idOf(req.params.id), req.biz.id);
    if (!l) throw new HttpError(404, 'غير موجود');
    const x = { ...l, ...(req.body || {}) };
    const installment = num(x.installment);
    if (!(installment > 0) || installment > l.amount) bad('القسط الشهري غير صحيح');
    if (!isMonth(x.start_month)) bad('الشهر غير صحيح');
    await db.run('UPDATE fund_loans SET installment = ?, start_month = ?, anonymous = ?, note = ? WHERE id = ?', r2(installment), x.start_month, x.anonymous ? 1 : 0, String(x.note || '').slice(0, 500) || null, l.id);
    await audit(req.biz.id, req.user.id, 'fund_loan_update', { before: { installment: l.installment, start_month: l.start_month, anonymous: l.anonymous }, after: { installment: r2(installment), start_month: x.start_month, anonymous: x.anonymous ? 1 : 0 } });
    return { ok: true };
  }));
  biz.delete('/fund/loans/:id', need('fund_manage'), wrap(async (req) => {
    const l = await db.get('SELECT l.*, m.name member FROM fund_loans l JOIN fund_members m ON m.id = l.member_id WHERE l.id = ? AND l.business_id = ? AND l.deleted_at IS NULL', idOf(req.params.id), req.biz.id);
    if (!l) throw new HttpError(404, 'غير موجود');
    if (await db.get('SELECT 1 x FROM fund_payments WHERE loan_id = ? AND deleted_at IS NULL', l.id)) bad('لا يمكن حذف قرض سُددت منه أقساط');
    await db.run('UPDATE fund_loans SET deleted_at = ? WHERE id = ?', ctx.nowLocal(), l.id);
    await audit(req.biz.id, req.user.id, 'fund_loan_delete', { before: { member: l.member, amount: l.amount, installment: l.installment } });
    return { ok: true };
  }));

  // ── import the past from the old Excel sheet: one row per member, one column per month ──
  // rows: [{ name, parent, monthly, payments: { 'YYYY-MM': amount } }]. With replace, the member's earlier dues in those
  // months are removed first, so the same file can be imported again after a correction without doubling anything.
  biz.post('/fund/import', need('fund_manage'), wrap(async (req) => {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    const replace = req.body?.replace !== false;
    if (!rows.length) bad('الملف لا يحتوي أعضاء');
    if (rows.length > 2000) bad('عدد الصفوف كبير جداً');
    const s = await db.get('SELECT * FROM fund_settings WHERE business_id = ?', req.biz.id);
    const now = cur();
    const norm = (v) => String(v || '').trim().replace(/\s+/g, ' ').slice(0, 100);
    const clean = rows.map((r, i) => {
      const name = norm(r.name);
      if (!name) bad('الصف {n}: الاسم فارغ', { n: i + 2 });
      const pays = Object.entries(r.payments || {}).map(([m, a]) => [m, num(a)]).filter(([, a]) => a);
      for (const [m, a] of pays) {
        if (!isMonth(m)) bad('الصف {n}: الشهر غير صحيح ({m})', { n: i + 2, m });
        if (m > now) bad('الصف {n}: الشهر {m} في المستقبل', { n: i + 2, m });
        if (!(a > 0) || a > 1e7) bad('الصف {n}: مبلغ غير صحيح في {m}', { n: i + 2, m });
      }
      const monthly = r.monthly === undefined || r.monthly === '' || r.monthly === null ? null : num(r.monthly);
      if (monthly !== null && !(monthly >= 0)) bad('الصف {n}: الاشتراك الشهري غير صحيح', { n: i + 2 });
      return { name, parent: norm(r.parent), monthly, pays };
    });
    const out = await db.tx(async () => {
      const list = await db.all('SELECT * FROM fund_members WHERE business_id = ? AND deleted_at IS NULL', req.biz.id);
      const byName = new Map(list.map(m => [m.name, m]));
      let created = 0, payments = 0, total = 0, removed = 0;
      const first = Object.fromEntries(clean.map(r => [r.name, r.pays.map(p => p[0]).sort()[0]]));
      for (const r of clean) {
        let m = byName.get(r.name);
        if (!m) {
          // most frequent paid amount when the monthly dues column is empty
          const freq = new Map(); for (const [, a] of r.pays) freq.set(a, (freq.get(a) || 0) + 1);
          const guess = [...freq.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;
          const monthly = r.monthly ?? guess;
          const join = first[r.name] && first[r.name] > s.start_month ? first[r.name] : s.start_month;
          const id = await db.insert('INSERT INTO fund_members (business_id, name, contributing, join_month) VALUES (?,?,?,?)', req.biz.id, r.name, monthly > 0 ? 1 : 0, join);
          if (monthly > 0) await db.insert('INSERT INTO fund_rates (member_id, from_month, amount) VALUES (?,?,?)', id, join, r2(monthly));
          m = { id, name: r.name, parent_id: null };
          byName.set(r.name, m); created++;
        } else if (r.monthly !== null && !(await db.get('SELECT 1 x FROM fund_rates WHERE member_id = ?', m.id))) {
          await db.insert('INSERT INTO fund_rates (member_id, from_month, amount) VALUES (?,?,?)', m.id, m.join_month || s.start_month, r2(r.monthly));
        }
        if (replace && r.pays.length) {
          for (const [mo] of r.pays) {
            const x = await db.get("SELECT COUNT(*) n FROM fund_payments WHERE member_id = ? AND month = ? AND kind = 'dues' AND deleted_at IS NULL", m.id, mo);
            if (x.n) { removed += x.n; await db.run("UPDATE fund_payments SET deleted_at = ?, deleted_by = ? WHERE member_id = ? AND month = ? AND kind = 'dues' AND deleted_at IS NULL", ctx.nowLocal(), req.user.id, m.id, mo); }
          }
        }
        for (const [mo, a] of r.pays) {
          await db.insert("INSERT INTO fund_payments (business_id, member_id, month, kind, amount, note, created_by) VALUES (?,?,?,'dues',?,?,?)", req.biz.id, m.id, mo, r2(a), 'استيراد', req.user.id);
          payments++; total += a;
        }
      }
      // parents by name (after everyone exists, so the order of rows does not matter)
      for (const r of clean) {
        if (!r.parent) continue;
        const m = byName.get(r.name), p = byName.get(r.parent);
        if (p && p.id !== m.id && !m.parent_id) {
          let ok = true; // no loops
          for (let q = p, i = 0; q && i < 500; i++) { if (q.id === m.id) { ok = false; break; } q = [...byName.values()].find(x => x.id === q.parent_id); }
          if (ok) { await db.run('UPDATE fund_members SET parent_id = ? WHERE id = ?', p.id, m.id); m.parent_id = p.id; }
        }
      }
      return { created, payments, total: r2(total), removed };
    });
    await audit(req.biz.id, req.user.id, 'fund_import', { rows: clean.length, ...out });
    return out;
  }));

  // ── messages to members (inside the system now; SMS / WhatsApp can be plugged in here later) ──
  async function notify(req, event, data) {
    // in-app bell now; a WhatsApp / SMS sender can be added here later (one place for every fund message)
    const bid = req.biz.id, m = data.member || {};
    const others = (ids) => ids.filter(id => id && id !== req.user.id);
    try {
      if (event === 'loan_requested')
        await ctx.notifyUsers(others(await ctx.usersWith(bid, ['fund_manage'])), bid, event, 'طلب قرض جديد من {name} بمبلغ {amount}', { name: m.name, amount: data.amount }, '#/loans');
      else if (event === 'loan_approved' || event === 'loan_rejected')
        await ctx.notifyUsers(others([data.requested_by, m.user_id]), bid, event,
          event === 'loan_approved' ? 'تمت الموافقة على طلب القرض ({amount})' : 'تم رفض طلب القرض ({amount})', { amount: data.amount, note: data.note || '' }, '#/loanreq');
    } catch (e) { console.error('notify failed:', e.message); }
  }

  // ── loan requests: a member asks, a supervisor approves (the loan is issued) or refuses ──
  const reqView = (r, members, users) => ({ ...r, member_name: members.find(m => m.id === r.member_id)?.name || '',
    requested_by_name: users.find(u => u.id === r.requested_by)?.name || '', decided_by_name: users.find(u => u.id === r.decided_by)?.name || '' });
  biz.get('/fund/requests', wrap(async (req) => {
    const d = await load(req.biz.id);
    const c = compute(d);
    const users = await db.all('SELECT id, name FROM users');
    let rows = await db.all('SELECT * FROM fund_loan_requests WHERE business_id = ? ORDER BY id DESC LIMIT 300', req.biz.id);
    if (!viewAll(req)) { const ids = new Set(mine(req, c.members).map(m => m.id)); rows = rows.filter(r => ids.has(r.member_id)); }
    // for the supervisor: everything needed to decide, next to each waiting request
    return rows.map(r => {
      const v = reqView(r, d.members, users);
      if (viewAll(req) && r.status === 'pending') {
        const m = c.members.find(x => x.id === r.member_id);
        if (m) Object.assign(v, { limit: loanLimit(m, d.settings), total_paid: m.total_paid, commitment: m.commitment, rating: m.rating, flagged: m.flagged,
          late_months: m.late_months, max_run: m.max_run, active_loans: r2(sum(c.loans.filter(l => l.member_id === m.id && l.status === 'active'), l => l.remaining)), balance: c.totals.balance });
      }
      return v;
    });
  }));
  biz.post('/fund/requests', wrap(async (req) => {
    const x = req.body || {};
    const d = await load(req.biz.id);
    const c = compute(d);
    const m = mine(req, c.members).find(y => y.id === idOf(x.member_id)) || (viewAll(req) && c.members.find(y => y.id === idOf(x.member_id)));
    if (!m) throw new HttpError(403, 'يمكنك طلب قرض لنفسك أو لأحد أبنائك فقط');
    if (m.relation === 'child' && !m.guardian_act && !viewAll(req)) throw new HttpError(403, 'طلب قرض باسم الابن يحتاج موافقة المشرف على «التصرف باسمه»');
    const amount = num(x.amount), months = parseInt(x.months);
    if (!(amount > 0)) bad('مبلغ القرض يجب أن يكون أكبر من صفر');
    if (!(months >= 1 && months <= 120)) bad('مدة السداد بين شهر و 120 شهراً');
    if (await db.get("SELECT 1 x FROM fund_loan_requests WHERE member_id = ? AND status = 'pending'", m.id)) bad('يوجد طلب قرض قيد المراجعة لهذا العضو');
    const limit = loanLimit(m, d.settings);
    const id = await db.insert('INSERT INTO fund_loan_requests (business_id, member_id, requested_by, amount, months, reason, anonymous, over_limit, flagged) VALUES (?,?,?,?,?,?,?,?,?)',
      req.biz.id, m.id, req.user.id, r2(amount), months, String(x.reason || '').trim().slice(0, 500) || null, x.anonymous ? 1 : 0, amount > limit + 0.005 ? 1 : 0, m.flagged ? 1 : 0);
    await audit(req.biz.id, req.user.id, 'fund_request_create', { member: m.name, amount: r2(amount), months, over_limit: amount > limit + 0.005 ? limit : undefined, flagged: m.flagged ? 1 : undefined });
    await notify(req, 'loan_requested', { member: m, amount: r2(amount) });
    return { id, limit, over_limit: amount > limit + 0.005, flagged: m.flagged };
  }));
  const getReq = async (req) => {
    const r = await db.get('SELECT * FROM fund_loan_requests WHERE id = ? AND business_id = ?', idOf(req.params.id), req.biz.id);
    if (!r) throw new HttpError(404, 'غير موجود');
    if (r.status !== 'pending') bad('تم البت في هذا الطلب مسبقاً');
    return r;
  };
  biz.post('/fund/requests/:id/cancel', wrap(async (req) => {
    const r = await getReq(req);
    if (r.requested_by !== req.user.id && !req.can('fund_manage')) throw new HttpError(403, 'ليس لديك صلاحية');
    await db.run("UPDATE fund_loan_requests SET status = 'cancelled', decided_by = ?, decided_at = ? WHERE id = ?", req.user.id, ctx.nowLocal(), r.id);
    await audit(req.biz.id, req.user.id, 'fund_request_cancel', { id: r.id, amount: r.amount });
    return { ok: true };
  }));
  biz.post('/fund/requests/:id/reject', need('fund_manage'), wrap(async (req) => {
    const r = await getReq(req);
    const note = String(req.body?.note || '').trim().slice(0, 500) || null;
    await db.run("UPDATE fund_loan_requests SET status = 'rejected', decided_by = ?, decided_at = ?, decision_note = ? WHERE id = ?", req.user.id, ctx.nowLocal(), note, r.id);
    const m = await db.get('SELECT * FROM fund_members WHERE id = ?', r.member_id);
    await audit(req.biz.id, req.user.id, 'fund_request_reject', { member: m?.name, amount: r.amount, note: note || undefined });
    await notify(req, 'loan_rejected', { member: m, amount: r.amount, requested_by: r.requested_by, note });
    return { ok: true };
  }));
  biz.post('/fund/requests/:id/approve', need('fund_manage'), wrap(async (req) => {
    const r = await getReq(req);
    const x = req.body || {};
    const amount = x.amount === undefined || x.amount === '' ? r.amount : num(x.amount);
    const installment = x.installment === undefined || x.installment === '' ? Math.ceil(amount / r.months * 100) / 100 : num(x.installment);
    const loanId = await issueLoan(req, { member_id: r.member_id, amount, installment, start_month: x.start_month, issued_date: x.issued_date,
      anonymous: r.anonymous, override: x.override, note: [`طلب #${r.id}`, r.reason].filter(Boolean).join(' — ') });
    const note = String(x.note || '').trim().slice(0, 500) || null;
    await db.run("UPDATE fund_loan_requests SET status = 'approved', decided_by = ?, decided_at = ?, decision_note = ?, loan_id = ? WHERE id = ?", req.user.id, ctx.nowLocal(), note, loanId, r.id);
    await audit(req.biz.id, req.user.id, 'fund_request_approve', { id: r.id, amount: r2(amount), installment: r2(installment), loan: loanId });
    await notify(req, 'loan_approved', { member: await db.get('SELECT * FROM fund_members WHERE id = ?', r.member_id), amount: r2(amount), requested_by: r.requested_by, note });
    return { ok: true, loan_id: loanId };
  }));

  // ── beneficiaries register: every member sees it; names hidden (★★★) when the borrower chose so ──
  biz.get('/fund/beneficiaries', wrap(async (req) => {
    const d = await load(req.biz.id);
    const c = compute(d);
    const own = new Set(mine(req, c.members).map(m => m.id));
    const rows = c.loans.map(l => ({ id: l.id, name: l.anonymous && !viewAll(req) && !own.has(l.member_id) && !d.settings.show_borrowers ? '★★★' : l.member_name, anonymous: l.anonymous,
      mine: own.has(l.member_id), amount: l.amount, paid: l.paid, remaining: l.remaining, paid_pct: l.paid_pct, status: l.status, month: l.issued_date.slice(0, 7) }));
    return { rows, totals: { issued: c.totals.loans_issued, repaid: c.totals.installments, outstanding: c.totals.loans_outstanding, balance: c.totals.balance, count: rows.length } };
  }));

  // who hears about a member: the member's own account, or the parent who follows them when they have none
  async function recipientsOf(m) {
    if (m.user_id) return [{ uid: m.user_id, self: true }];
    if (m.guardian_access) for (const pid of [m.parent_id, m.mother_id].filter(Boolean)) { // the father, else the mother
      const p = await db.get('SELECT user_id FROM fund_members WHERE id = ? AND deleted_at IS NULL', pid);
      if (p && p.user_id) return [{ uid: p.user_id, self: false }];
    }
    return [];
  }

  // ── official receipt for every payment ──
  async function receiptNotice(req, m, p) {
    try {
      for (const r of await recipientsOf(m)) if (r.uid !== req.user.id)
        await ctx.notifyUsers([r.uid], req.biz.id, 'fund_receipt', p.kind === 'dues' ? 'وصل اشتراك {name} لشهر {month}: {amount} — إيصال {no}' : 'وصل قسط قرض {name}: {amount} — إيصال {no}',
          { name: m.name, month: p.month, amount: p.amount, no: receiptNo(p.id) }, '#/receipt/' + p.id);
    } catch (e) { console.error('receipt notice failed:', e.message); }
  }
  biz.get('/fund/receipts/:id', wrap(async (req) => {
    const p = await db.get('SELECT * FROM fund_payments WHERE id = ? AND business_id = ?', idOf(req.params.id), req.biz.id);
    if (!p) throw new HttpError(404, 'غير موجود');
    const d = await load(req.biz.id);
    const c = compute(d);
    if (!(viewAll(req) || req.can('fund_collect') || mine(req, c.members).some(m => m.id === p.member_id))) throw new HttpError(404, 'غير موجود');
    const m = c.members.find(x => x.id === p.member_id) || await db.get('SELECT * FROM fund_members WHERE id = ?', p.member_id);
    const by = await db.get('SELECT name FROM users WHERE id = ?', p.created_by);
    let loan = null;
    if (p.loan_id) {
      const l = await db.get('SELECT * FROM fund_loans WHERE id = ?', p.loan_id);
      const paidTo = sum(d.payments.filter(x => x.loan_id === p.loan_id && x.id <= p.id), x => x.amount);
      if (l) loan = { amount: l.amount, installment: l.installment, remaining_after: r2(Math.max(0, l.amount - paidTo)) };
    }
    const parent = m.parent_id ? d.members.find(x => x.id === m.parent_id) : null;
    return { no: receiptNo(p.id), id: p.id, fund: req.biz.name, motto: d.settings.motto, member: { id: m.id, name: m.name, parent: parent?.name || '' },
      kind: p.kind, extra: !!p.extra, month: p.month, for_month: p.for_month || null, amount: p.amount, note: p.note, created_at: p.created_at, by: by?.name || '', deleted: !!p.deleted_at, loan,
      now: { arrears: m.arrears ?? null, total_paid: m.total_paid ?? null, commitment: m.commitment ?? null } };
  }));

  // ── monthly statement: one member, one month, as it stood at the end of that month ──
  function statementOf(d, m, M) {
    const now = M >= cur() ? M : nextMonth(M);
    const pays = d.payments.filter(p => p.member_id === m.id && p.month <= M);
    const led = memberLedger(m, d.rates.filter(r => r.member_id === m.id), pays, d.settings.start_month, now);
    const row = led.months.find(x => x.m === M) || { m: M, due: 0, paid: 0, covered: 0, status: 'none' };
    const loans = d.loans.filter(l => l.member_id === m.id && l.issued_date.slice(0, 7) <= M).map(l => loanLedger(l, pays, now))
      .map(l => ({ amount: l.amount, installment: l.installment, paid: l.paid, remaining: l.remaining, arrears: l.arrears, status: l.status, issued_date: l.issued_date }));
    const inMonth = pays.filter(p => p.month === M);
    return { month: M, member: { id: m.id, name: m.name }, due: row.due, status: row.status,
      paid_month: r2(sum(inMonth.filter(p => p.kind === 'dues'), p => p.amount)), installments_month: r2(sum(inMonth.filter(p => p.kind === 'installment'), p => p.amount)),
      arrears: led.arrears, total_paid: led.total_paid, commitment: led.commitment, rating: led.rating, late_months: led.late_months,
      months: led.months.filter(x => x.m <= M).slice(-12), loans,
      payments: inMonth.map(p => ({ id: p.id, no: receiptNo(p.id), kind: p.kind, amount: p.amount, created_at: p.created_at })) };
  }
  biz.get('/fund/statement/:id', wrap(async (req) => {
    const d = await load(req.biz.id);
    const c = compute(d);
    const id = idOf(req.params.id);
    const choices = viewAll(req) ? c.members : mine(req, c.members);
    const m = choices.find(x => x.id === id);
    if (!m) throw new HttpError(404, 'غير موجود');
    const first = m.join_month && m.join_month > d.settings.start_month ? m.join_month : d.settings.start_month;
    let M = isMonth(req.query.month) ? req.query.month : prevMonth(cur());
    if (M > cur()) M = cur();
    if (M < first) M = first;
    return { ...statementOf(d, m, M), fund: req.biz.name, motto: d.settings.motto, first, last: cur(),
      choices: choices.map(x => ({ id: x.id, name: x.name })) };
  }));
  // send last month's statements of one fund (each member once a month; a supervisor may send them again)
  async function sendStatements(bid, M) {
    const d = await load(bid);
    let n = 0;
    for (const m of d.members) {
      if (m.join_month && m.join_month > M) continue;
      const st = statementOf(d, m, M);
      if (!st.due && !st.total_paid && !st.loans.some(l => l.status === 'active')) continue;
      const vars = { name: m.name, month: M, paid: r2(st.paid_month + st.installments_month), arrears: st.arrears, commitment: st.commitment === null ? '—' : st.commitment + '%' };
      for (const r of await recipientsOf(m)) {
        await ctx.notifyUsers([r.uid], bid, 'fund_statement', r.self ? 'كشف حسابك لشهر {month} جاهز — دفعت {paid}، المتأخرات {arrears}، الالتزام {commitment}' : 'كشف حساب {name} لشهر {month} جاهز — دفع {paid}، المتأخرات {arrears}', vars, `#/statement/${m.id}/${M}`);
        n++;
      }
    }
    return n;
  }
  app.locals.fundStatements = async () => {
    const M = prevMonth(cur());
    const funds = await db.all("SELECT b.id FROM businesses b JOIN fund_settings s ON s.business_id = b.id WHERE b.kind = 'fund' AND s.start_month <= ? AND (s.statement_month IS NULL OR s.statement_month < ?)", M, M);
    for (const f of funds) {
      // claim the month first, so two servers never send twice
      const r = await db.run('UPDATE fund_settings SET statement_month = ? WHERE business_id = ? AND (statement_month IS NULL OR statement_month < ?)', M, f.id, M);
      if (!r.changes) continue;
      const n = await sendStatements(f.id, M);
      await audit(f.id, null, 'fund_statements_send', { month: M, sent: n, auto: true });
    }
  };
  biz.post('/fund/statements/send', need('fund_manage'), wrap(async (req) => {
    const s = await db.get('SELECT * FROM fund_settings WHERE business_id = ?', req.biz.id);
    const M = prevMonth(cur());
    if (M < s.start_month) bad('لا يوجد شهر منتهٍ بعد');
    const n = await sendStatements(req.biz.id, M);
    await db.run('UPDATE fund_settings SET statement_month = ? WHERE business_id = ?', M, req.biz.id);
    await audit(req.biz.id, req.user.id, 'fund_statements_send', { month: M, sent: n });
    return { month: M, sent: n };
  }));

  // ── impact of the fund + its goals (every account; no names) ──
  const GOAL_KINDS = ['campaign', 'balance', 'collected', 'members'];
  const GOAL_COLORS = ['sunset', 'rose', 'gold', 'forest', 'ocean', 'brand'];
  // the owner's wording and look of «أثر الصندوق»: texts (empty = the default), colours, header picture, sections shown
  const PAGE_TEXTS = { kicker: 40, title: 80, since: 60, wafa_title: 60, wafa_text: 300, s_collected: 60, s_loans: 60, s_repaid: 60, s_members: 60, s_balance: 60, s_last: 60,
    goals_title: 60, journey_title: 60, footer: 400 };
  const PAGE_THEMES = ['warm', 'brand', 'ocean', 'forest', 'rose', 'gold', 'night'];
  const PAGE_SECTIONS = ['wafa', 'stats', 'goals', 'journey', 'footer'];
  biz.put('/fund/impact-page', need('fund_manage'), wrap(async (req) => {
    const x = req.body || {};
    const s = await db.get('SELECT impact_page FROM fund_settings WHERE business_id = ?', req.biz.id);
    let before = {}; try { before = JSON.parse(s?.impact_page || '{}') || {}; } catch { }
    const n = (v, a, b, dflt) => { v = Number(v); return Number.isFinite(v) ? Math.round(Math.min(b, Math.max(a, v))) : dflt; };
    const page = { texts: {}, hide: [] };
    for (const [k, max] of Object.entries(PAGE_TEXTS)) { const v = String(x.texts?.[k] ?? '').trim().slice(0, max); if (v) page.texts[k] = v; }
    page.theme = PAGE_THEMES.includes(x.theme) ? x.theme : 'warm';
    page.size = ['s', 'm', 'l'].includes(x.size) ? x.size : 'm';
    page.hide = PAGE_SECTIONS.filter(k => Array.isArray(x.hide) && x.hide.includes(k));
    if (x.image) {
      if (!IMG_RE.test(x.image) || x.image.length > 900 * 1024) bad('الصورة غير مدعومة أو حجمها كبير');
      page.image = x.image; page.img = { x: n(x.img?.x, 0, 100, 50), y: n(x.img?.y, 0, 100, 50), zoom: n(x.img?.zoom, 100, 300, 100), shade: n(x.img?.shade, 0, 90, 45) };
    }
    const json = JSON.stringify(page);
    if (json.length > 1000 * 1024) bad('حجم بيانات الصفحة كبير جداً');
    await db.run('UPDATE fund_settings SET impact_page = ? WHERE business_id = ?', json, req.biz.id);
    const brief = (p) => ({ texts: Object.keys(p.texts || {}).length, theme: p.theme || 'warm', size: p.size || 'm', image: p.image ? 'صورة' : '', hidden: (p.hide || []).join('، ') });
    await audit(req.biz.id, req.user.id, 'fund_impact_page', { before: brief(before), after: brief(page) });
    return { ok: true };
  }));
  biz.get('/fund/impact', wrap(async (req) => {
    const bid = req.biz.id;
    const d = await load(bid);
    const c = compute(d);
    const manage = req.can('fund_manage');
    const goals = await db.all('SELECT * FROM fund_goals WHERE business_id = ? AND deleted_at IS NULL ORDER BY sort, id', bid);
    const gifts = await db.all('SELECT * FROM fund_goal_gifts WHERE business_id = ? AND deleted_at IS NULL', bid);
    const own = new Set(mine(req, c.members).map(m => m.id));
    const progressOf = (g) => g.kind === 'campaign' ? sum(gifts.filter(x => x.goal_id === g.id), x => x.amount)
      : g.kind === 'balance' ? c.totals.balance : g.kind === 'collected' ? c.totals.collected : g.kind === 'members' ? c.totals.contributors : 0;
    const list = goals.filter(g => manage || g.active).map(g => {
      const mine_ = gifts.filter(x => x.goal_id === g.id && own.has(x.member_id));
      const progress = r2(progressOf(g));
      const gs = gifts.filter(x => x.goal_id === g.id);
      return { id: g.id, title: g.title, description: g.description, kind: g.kind, target: g.target, emoji: g.emoji, color: g.color, deadline: g.deadline, active: g.active, sort: g.sort,
        done: !!g.done_at || (g.target > 0 && progress >= g.target - 0.005), done_at: g.done_at, progress, pct: g.target > 0 ? Math.min(100, Math.round(progress / g.target * 1000) / 10) : 0,
        givers: new Set(gs.map(x => x.member_id ? 'm' + x.member_id : 'g' + x.id)).size, mine: r2(sum(mine_, x => x.amount)) };
    });
    // generations in the family tree
    const byId = new Map(d.members.map(m => [m.id, m]));
    const depth = (m, seen = new Set()) => { if (!m || seen.has(m.id)) return 0; seen.add(m.id); return 1 + depth(byId.get(m.parent_id), seen); };
    const generations = Math.max(0, ...d.members.map(m => depth(m)));
    // the journey, year by year
    const yearOf = (s) => s.slice(0, 4);
    const years = [];
    if (c.series.length) for (let y = Number(d.settings.start_month.slice(0, 4)); y <= Number(c.now.slice(0, 4)); y++) {
      const Y = String(y);
      years.push({ year: Y,
        collected: r2(sum(d.payments.filter(p => p.kind === 'dues' && yearOf(p.month) === Y), p => p.amount)),
        repaid: r2(sum(d.payments.filter(p => p.kind === 'installment' && yearOf(p.month) === Y), p => p.amount)),
        loans: d.loans.filter(l => yearOf(l.issued_date) === Y).length, lent: r2(sum(d.loans.filter(l => yearOf(l.issued_date) === Y), l => l.amount)),
        joined: d.members.filter(m => m.join_month && yearOf(m.join_month) === Y && m.join_month > d.settings.start_month).length,
        gifts: r2(sum(gifts.filter(x => yearOf(x.date) === Y), x => x.amount)) });
    }
    // months in which every contributor paid in full
    const closed = c.series.map(s => s.m).filter(mo => mo < c.now);
    const fullMonths = closed.filter(mo => { const rows = c.members.map(m => m.months.find(x => x.m === mo)).filter(x => x && x.due > 0); return rows.length && rows.every(x => x.status === 'full' || x.status === 'late'); }).length;
    let page = {}; try { page = JSON.parse(d.settings.impact_page || '{}') || {}; } catch { }
    return { page, name: req.biz.name, motto: d.settings.motto, start_month: d.settings.start_month, now: c.now, months: c.totals.months,
      totals: { collected: c.totals.collected, balance: c.totals.balance, loans_issued: c.totals.loans_issued, loans_count: c.totals.loans_count, repaid: c.totals.installments,
        contributors: c.totals.contributors, collection_rate: c.totals.collection_rate },
      family: { members: d.members.length, living: d.members.filter(m => !m.deceased).length, generations, borrowers: new Set(d.loans.map(l => l.member_id)).size },
      gifts_total: r2(sum(gifts, x => x.amount)), full_months: fullMonths, closed_months: closed.length, years, goals: list, manage };
  }));
  const goalData = (x, old = {}) => {
    const v = {
      title: String(x.title ?? old.title ?? '').trim().slice(0, 120), description: String(x.description ?? old.description ?? '').trim().slice(0, 600) || null,
      kind: GOAL_KINDS.includes(x.kind) ? x.kind : (old.kind || 'campaign'), target: x.target === undefined ? old.target : r2(num(x.target)),
      emoji: String(x.emoji ?? old.emoji ?? '').trim().slice(0, 8) || null, color: GOAL_COLORS.includes(x.color) ? x.color : (old.color || 'sunset'),
      deadline: x.deadline === undefined ? (old.deadline ?? null) : (x.deadline ? (ctx.isDate(x.deadline) ? x.deadline : bad('التاريخ غير صحيح')) : null),
      active: x.active === undefined ? (old.active ?? 1) : (x.active ? 1 : 0), sort: parseInt(x.sort ?? old.sort ?? 0) || 0,
    };
    if (!v.title) bad('عنوان الهدف مطلوب');
    if (!(v.target > 0)) bad('المستهدف يجب أن يكون أكبر من صفر');
    return v;
  };
  biz.post('/fund/goals', need('fund_manage'), wrap(async (req) => {
    const v = goalData(req.body || {});
    const id = await db.insert('INSERT INTO fund_goals (business_id, title, description, kind, target, emoji, color, deadline, active, sort) VALUES (?,?,?,?,?,?,?,?,?,?)',
      req.biz.id, v.title, v.description, v.kind, v.target, v.emoji, v.color, v.deadline, v.active, v.sort);
    await audit(req.biz.id, req.user.id, 'fund_goal_create', { after: { title: v.title, target: v.target } });
    return { id };
  }));
  const getGoal = async (req) => {
    const g = await db.get('SELECT * FROM fund_goals WHERE id = ? AND business_id = ? AND deleted_at IS NULL', idOf(req.params.id), req.biz.id);
    if (!g) throw new HttpError(404, 'غير موجود');
    return g;
  };
  biz.put('/fund/goals/:id', need('fund_manage'), wrap(async (req) => {
    const g = await getGoal(req);
    const v = goalData(req.body || {}, g);
    const done = req.body?.done === undefined ? g.done_at : (req.body.done ? (g.done_at || ctx.nowLocal()) : null);
    await db.run('UPDATE fund_goals SET title=?, description=?, kind=?, target=?, emoji=?, color=?, deadline=?, active=?, sort=?, done_at=? WHERE id=?',
      v.title, v.description, v.kind, v.target, v.emoji, v.color, v.deadline, v.active, v.sort, done, g.id);
    await audit(req.biz.id, req.user.id, 'fund_goal_update', { before: { title: g.title, target: g.target }, after: { title: v.title, target: v.target, done: !!done } });
    return { ok: true };
  }));
  biz.delete('/fund/goals/:id', need('fund_manage'), wrap(async (req) => {
    const g = await getGoal(req);
    await db.run('UPDATE fund_goals SET deleted_at = ? WHERE id = ?', ctx.nowLocal(), g.id);
    await audit(req.biz.id, req.user.id, 'fund_goal_delete', { before: { title: g.title, target: g.target } });
    return { ok: true };
  }));
  // gifts to a campaign (kept apart from the fund balance: they go to the campaign's cause)
  biz.get('/fund/goals/:id/gifts', need('fund_view_all', 'fund_manage'), wrap(async (req) => {
    const g = await getGoal(req);
    return db.all(`SELECT x.*, m.name member_name, u.name by_name FROM fund_goal_gifts x LEFT JOIN fund_members m ON m.id = x.member_id LEFT JOIN users u ON u.id = x.created_by
      WHERE x.goal_id = ? AND x.deleted_at IS NULL ORDER BY x.date DESC, x.id DESC`, g.id);
  }));
  biz.post('/fund/goals/:id/gifts', need('fund_collect', 'fund_manage'), wrap(async (req) => {
    const g = await getGoal(req);
    if (g.kind !== 'campaign') bad('هذا الهدف يُحسب تلقائياً من أرقام الصندوق');
    const x = req.body || {};
    const amount = num(x.amount);
    if (!(amount > 0)) bad('المبلغ يجب أن يكون أكبر من صفر');
    const date = x.date ? (ctx.isDate(x.date) ? x.date : bad('التاريخ غير صحيح')) : today();
    let m = null;
    if (x.member_id) { m = await db.get('SELECT * FROM fund_members WHERE id = ? AND business_id = ? AND deleted_at IS NULL', idOf(x.member_id), req.biz.id); if (!m) bad('العضو غير موجود'); }
    const donor = m ? null : (String(x.donor || '').trim().slice(0, 80) || 'فاعل خير');
    const id = await db.insert('INSERT INTO fund_goal_gifts (business_id, goal_id, member_id, donor, amount, date, note, created_by) VALUES (?,?,?,?,?,?,?,?)',
      req.biz.id, g.id, m ? m.id : null, donor, r2(amount), date, String(x.note || '').trim().slice(0, 300) || null, req.user.id);
    await audit(req.biz.id, req.user.id, 'fund_gift', { goal: g.title, member: m?.name || donor, amount: r2(amount) });
    if (m) try {
      for (const r of await recipientsOf(m)) if (r.uid !== req.user.id)
        await ctx.notifyUsers([r.uid], req.biz.id, 'fund_gift', 'جزاكم الله خيراً، وصلت مساهمة {name} في «{goal}»: {amount}', { name: m.name, goal: g.title, amount: r2(amount) }, '#/impact');
    } catch (e) { console.error('gift notice failed:', e.message); }
    return { id };
  }));
  biz.delete('/fund/gifts/:id', need('fund_manage'), wrap(async (req) => {
    const x = await db.get('SELECT x.*, g.title FROM fund_goal_gifts x JOIN fund_goals g ON g.id = x.goal_id WHERE x.id = ? AND x.business_id = ? AND x.deleted_at IS NULL', idOf(req.params.id), req.biz.id);
    if (!x) throw new HttpError(404, 'غير موجود');
    await db.run('UPDATE fund_goal_gifts SET deleted_at = ? WHERE id = ?', ctx.nowLocal(), x.id);
    await audit(req.biz.id, req.user.id, 'fund_gift_delete', { before: { goal: x.title, amount: x.amount } });
    return { ok: true };
  }));

  // ── banners on the fund page (text and / or picture), managed by the supervisor ──
  const IMG_RE = /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
  const COLORS = ['brand', 'sunset', 'ocean', 'forest', 'rose', 'gold', 'night'];
  const bannerData = (x, old = {}) => {
    const L = x.layout && typeof x.layout === 'object' ? x.layout : (() => { try { return JSON.parse(old.layout || '{}'); } catch { return {}; } })();
    const clamp = (n, a, b, d) => { n = Number(n); return Number.isFinite(n) ? Math.round(Math.min(b, Math.max(a, n))) : d; };
    const layout = JSON.stringify({ size: ['s', 'm', 'l'].includes(L.size) ? L.size : 'm', x: clamp(L.x, 0, 100, 50), y: clamp(L.y, 0, 100, 50), zoom: clamp(L.zoom, 100, 300, 100), shade: clamp(L.shade, 0, 90, 55) });
    const v = { layout, title: String(x.title ?? old.title ?? '').trim().slice(0, 120) || null, body: String(x.body ?? old.body ?? '').trim().slice(0, 400) || null,
      color: COLORS.includes(x.color) ? x.color : (old.color || 'brand'), active: x.active === undefined ? (old.active ?? 1) : (x.active ? 1 : 0), sort: parseInt(x.sort ?? old.sort ?? 0) || 0,
      image: x.image === undefined ? (old.image ?? null) : (x.image || null) };
    if (v.image && (!IMG_RE.test(v.image) || v.image.length > 900 * 1024)) bad('الصورة غير مدعومة أو حجمها كبير');
    if (!v.title && !v.body && !v.image) bad('اكتب عنواناً أو نصاً أو أضف صورة');
    return v;
  };
  biz.get('/fund/banners', need('fund_manage'), wrap((req) => db.all('SELECT * FROM fund_banners WHERE business_id = ? ORDER BY sort, id', req.biz.id)));
  biz.post('/fund/banners', need('fund_manage'), wrap(async (req) => {
    const v = bannerData(req.body || {});
    const id = await db.insert('INSERT INTO fund_banners (business_id, title, body, color, image, active, sort, layout) VALUES (?,?,?,?,?,?,?,?)', req.biz.id, v.title, v.body, v.color, v.image, v.active, v.sort, v.layout);
    await audit(req.biz.id, req.user.id, 'fund_banner', { after: { title: v.title || '', body: v.body || '', image: v.image ? 'صورة' : '' } });
    return { id };
  }));
  biz.put('/fund/banners/:id', need('fund_manage'), wrap(async (req) => {
    const b = await db.get('SELECT * FROM fund_banners WHERE id = ? AND business_id = ?', idOf(req.params.id), req.biz.id);
    if (!b) throw new HttpError(404, 'غير موجود');
    const v = bannerData(req.body || {}, b);
    await db.run('UPDATE fund_banners SET title=?, body=?, color=?, image=?, active=?, sort=?, layout=? WHERE id=?', v.title, v.body, v.color, v.image, v.active, v.sort, v.layout, b.id);
    await audit(req.biz.id, req.user.id, 'fund_banner', { before: { title: b.title || '', body: b.body || '', active: b.active }, after: { title: v.title || '', body: v.body || '', active: v.active } });
    return { ok: true };
  }));
  biz.delete('/fund/banners/:id', need('fund_manage'), wrap(async (req) => {
    const b = await db.get('SELECT * FROM fund_banners WHERE id = ? AND business_id = ?', idOf(req.params.id), req.biz.id);
    if (!b) throw new HttpError(404, 'غير موجود');
    await db.run('DELETE FROM fund_banners WHERE id = ?', b.id);
    await audit(req.biz.id, req.user.id, 'fund_banner_delete', { before: { title: b.title || '', body: b.body || '' } });
    return { ok: true };
  }));

  // ── the fund report: every member sees all the figures; other people's names are hidden unless
  //    the supervisor shows them to everyone, or granted this member a look with names ──
  const grantOf = (req) => db.get("SELECT * FROM fund_report_requests WHERE business_id = ? AND user_id = ? AND status = 'approved' AND expires_on >= ? ORDER BY id DESC LIMIT 1", req.biz.id, req.user.id, today());
  biz.get('/fund/report', wrap(async (req) => {
    const d = await load(req.biz.id);
    const c = compute(d);
    const own = new Set(mine(req, c.members).map(m => m.id));
    const grant = viewAll(req) ? null : await grantOf(req);
    const named = viewAll(req) || !!d.settings.show_names || !!grant;
    // stable numbers for hidden names ("member 7" stays member 7 from one month to the next)
    const salt = String(req.biz.created_at) + d.settings.start_month;
    const order = c.members.filter(m => m.contributing || m.total_paid).sort((a, b) => shuffleKey(req.biz.id, a.id, salt) < shuffleKey(req.biz.id, b.id, salt) ? -1 : 1);
    const no = new Map(order.map((m, i) => [m.id, i + 1]));
    const label = (m) => named || own.has(m.id) ? { name: m.name } : { no: no.get(m.id) };
    const members = order.map(m => ({ ...label(m), mine: own.has(m.id), monthly: m.monthly, total_paid: m.total_paid, share: m.share, commitment: m.commitment,
      rating: m.rating, late_months: m.late_months, arrears: m.arrears, left: !!m.left_month })).sort((x, y) => y.total_paid - x.total_paid);
    // families (a head with everyone under them) — named like the people
    const up = (m) => m.spouse_id && c.members.some(q => q.id === m.spouse_id) ? m.spouse_id : m.parent_id; // a wife belongs to her husband's family
    const kids = (id) => c.members.filter(m => up(m) === id), below = (m) => [m, ...kids(m.id).flatMap(below)];
    const tops = c.members.filter(m => !up(m) || !c.members.some(q => q.id === up(m)));
    const fno = new Map(); let fi = 0;
    const families = tops.flatMap(t => !t.contributing && kids(t.id).length ? kids(t.id) : [t]).map(h => {
      const all = below(h), payers = all.filter(m => m.contributing);
      const due = sum(all, m => m.due_closed), cov = sum(all, m => m.covered_closed);
      return { h, count: payers.length, total: r2(sum(all, m => m.total_paid)), commitment: due ? Math.round(cov / due * 1000) / 10 : null, mine: all.some(m => own.has(m.id)) };
    }).filter(f => f.count || f.total).sort((a, b) => shuffleKey(req.biz.id, 'f' + a.h.id, salt) < shuffleKey(req.biz.id, 'f' + b.h.id, salt) ? -1 : 1).map(f => {
      // someone with children under them is a "family"; someone alone is shown by their own name (or member number)
      const family = kids(f.h.id).length > 0;
      const who = named || f.mine ? { name: f.h.name } : family ? { no: fno.set(f.h.id, ++fi).get(f.h.id) } : { no: no.get(f.h.id) };
      return { ...who, family, mine: f.mine, count: f.count, total: f.total, commitment: f.commitment };
    }).sort((x, y) => y.total - x.total);
    const loans = c.loans.map(l => ({ name: viewAll(req) || own.has(l.member_id) || d.settings.show_borrowers || (named && !l.anonymous) ? l.member_name : '★★★',
      mine: own.has(l.member_id), amount: l.amount, paid: l.paid, remaining: l.remaining, paid_pct: l.paid_pct, status: l.status, month: l.issued_date.slice(0, 7) }));
    const pending = viewAll(req) ? null : await db.get("SELECT id, created_at FROM fund_report_requests WHERE business_id = ? AND user_id = ? AND status = 'pending'", req.biz.id, req.user.id);
    const ratings = { excellent: 0, good: 0, irregular: 0, follow: 0, new: 0 };
    for (const m of c.members.filter(x => x.contributing && !x.left_month)) ratings[m.rating]++;
    return { name: req.biz.name, now: c.now, totals: c.totals, series: c.series, members, families, loans, ratings,
      privacy: { named, by: viewAll(req) ? 'supervisor' : d.settings.show_names ? 'everyone' : grant ? 'grant' : 'hidden', until: grant?.expires_on || null, pending: !!pending,
        show_borrowers: !!d.settings.show_borrowers } };
  }));
  biz.post('/fund/report-requests', wrap(async (req) => {
    const s = await db.get('SELECT show_names FROM fund_settings WHERE business_id = ?', req.biz.id);
    if (viewAll(req) || s.show_names || await grantOf(req)) bad('الأسماء ظاهرة لك بالفعل');
    if (await db.get("SELECT 1 x FROM fund_report_requests WHERE business_id = ? AND user_id = ? AND status = 'pending'", req.biz.id, req.user.id)) bad('طلبك قيد المراجعة');
    const id = await db.insert('INSERT INTO fund_report_requests (business_id, user_id) VALUES (?,?)', req.biz.id, req.user.id);
    await audit(req.biz.id, req.user.id, 'fund_report_request', { name: req.user.name });
    await ctx.notifyUsers((await ctx.usersWith(req.biz.id, ['fund_manage'])).filter(u => u !== req.user.id), req.biz.id, 'report_requested', '{name} يطلب عرض تقرير الصندوق بالأسماء', { name: req.user.name }, '#/freport');
    return { id };
  }));
  biz.get('/fund/report-requests', need('fund_manage'), wrap((req) => db.all(`SELECT r.*, u.name user_name, d.name decided_by_name FROM fund_report_requests r JOIN users u ON u.id = r.user_id
    LEFT JOIN users d ON d.id = r.decided_by WHERE r.business_id = ? ORDER BY r.id DESC LIMIT 100`, req.biz.id)));
  biz.post('/fund/report-requests/:id/:act', need('fund_manage'), wrap(async (req) => {
    const r = await db.get("SELECT * FROM fund_report_requests WHERE id = ? AND business_id = ?", idOf(req.params.id), req.biz.id);
    if (!r) throw new HttpError(404, 'غير موجود');
    const act = req.params.act;
    if (!['approve', 'reject', 'revoke'].includes(act)) throw new HttpError(404, 'غير موجود');
    if (act === 'revoke' ? r.status !== 'approved' : r.status !== 'pending') bad('تم البت في هذا الطلب مسبقاً');
    const days = Math.min(365, Math.max(1, parseInt(req.body?.days) || 30));
    const until = (() => { const t = new Date(today() + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + days); return t.toISOString().slice(0, 10); })();
    if (act === 'approve') await db.run("UPDATE fund_report_requests SET status = 'approved', expires_on = ?, decided_by = ?, decided_at = ? WHERE id = ?", until, req.user.id, ctx.nowLocal(), r.id);
    else if (act === 'reject') await db.run("UPDATE fund_report_requests SET status = 'rejected', decided_by = ?, decided_at = ? WHERE id = ?", req.user.id, ctx.nowLocal(), r.id);
    else await db.run("UPDATE fund_report_requests SET expires_on = ?, decided_by = ?, decided_at = ? WHERE id = ?", '0000-00-00', req.user.id, ctx.nowLocal(), r.id);
    const who = await db.get('SELECT name FROM users WHERE id = ?', r.user_id);
    await audit(req.biz.id, req.user.id, 'fund_report_' + act, { name: who?.name, until: act === 'approve' ? until : undefined });
    if (act !== 'revoke') await ctx.notifyUsers([r.user_id], req.biz.id, 'report_' + act,
      act === 'approve' ? 'يمكنك الآن عرض تقرير الصندوق بالأسماء حتى {until}' : 'لم تتم الموافقة على عرض التقرير بالأسماء', { until }, '#/freport');
    return { ok: true, until: act === 'approve' ? until : null };
  }));
};

// a new fund business: settings + the two usual categories
module.exports.seedFund = async (db, bid, month) => {
  await db.run('INSERT INTO fund_settings (business_id, start_month) VALUES (?,?)', bid, month);
  await db.insert('INSERT INTO fund_categories (business_id, name, amount) VALUES (?,?,?)', bid, 'موظف', 50);
  await db.insert('INSERT INTO fund_categories (business_id, name, amount) VALUES (?,?,?)', bid, 'غير موظف', 10);
};
module.exports.FUND_PERMS = FUND_PERMS;
module.exports.FUND_EDIT_ACTIONS = FUND_EDIT_ACTIONS;
