'use strict';
/* ═════════════════════════ language ═════════════════════════ */
// Arabic is the source language; English comes from I18N_EN (i18n.js). Switching reloads the page.
let LANG = 'ar';
try { LANG = localStorage.getItem('lang') === 'en' ? 'en' : 'ar'; } catch { }
const MISSING = new Set();
function T(s, vars) {
  let out = s;
  if (LANG === 'en') {
    const k = String(s).trim();
    if (window.I18N_EN && I18N_EN[k] !== undefined) out = String(s).replace(k, I18N_EN[k]);
    else if (/[؀-ۿ]/.test(k)) MISSING.add(k);
  }
  if (vars) out = out.replace(/\{(\w+)\}/g, (m, v) => vars[v] ?? m);
  return out;
}
const ARROW = LANG === 'en' ? '→' : '←'; // "before → after" reads in the page direction
document.documentElement.lang = LANG;
document.documentElement.dir = LANG === 'en' ? 'ltr' : 'rtl';
document.title = T('نظام الإقفال اليومي');
function setLang(l) { try { localStorage.setItem('lang', l); } catch { } location.reload(); }
const langBtn = (cls = 'btn sm') => `<button type="button" class="${cls}" onclick="setLang('${LANG === 'en' ? 'ar' : 'en'}')" title="${LANG === 'en' ? 'عربي' : 'English'}">${icon('globe')}<span>${LANG === 'en' ? 'عربي' : 'English'}</span></button>`;

/* ═════════════════════════ icons ═════════════════════════ */
// one consistent line-icon set (24×24, stroke = currentColor), works offline
const ICONS = {
  home: '<path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  clipboard: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
  chart: '<path d="M3 3v18h18"/><path d="M18 17V9M13 17V5M8 17v-3"/>',
  wallet: '<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>',
  history: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
  sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  receipt: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
  truck: '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/>',
  eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a13.2 13.2 0 0 1-1.67 2.68M6.61 6.61A13.5 13.5 0 0 0 2 12s3 7 10 7a9.7 9.7 0 0 0 5.39-1.61M14.12 14.12a3 3 0 1 1-4.24-4.24M2 2l20 20"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  chevL: '<path d="m15 18-6-6 6-6"/>',
  chevR: '<path d="m9 18 6-6-6-6"/>',
  printer: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/>',
  monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
  palette: '<circle cx="13.5" cy="6.5" r="1.2"/><circle cx="17.5" cy="10.5" r="1.2"/><circle cx="8.5" cy="7.5" r="1.2"/><circle cx="6.5" cy="12.5" r="1.2"/><path d="M12 2a10 10 0 0 0 0 20c.93 0 1.5-.75 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16a6 6 0 0 0 6-6c0-4.96-4.48-9-10-9z"/>',
  store: '<path d="M3 9l1.5-5h15L21 9"/><path d="M3 9h18v1.5a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z"/><path d="M5 13v8h14v-8"/><path d="M10 21v-5h4v5"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3z"/><path d="M12 9v4M12 17h.01"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  package: '<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>',
  layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>',
  sigma: '<path d="M18 7V4H6l6 8-6 8h12v-3"/>',
  arrowDown: '<path d="M12 5v14M19 12l-7 7-7-7"/>',
  arrowUp: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>',
  undo: '<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>',
  coins: '<circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18M7 6h1v4M16.71 13.88l.7.71-2.82 2.82"/>',
  landmark: '<path d="M3 22h18M6 18v-7M10 18v-7M14 18v-7M18 18v-7M12 2l9 5H3z"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  minusCircle: '<circle cx="12" cy="12" r="10"/><path d="M8 12h8"/>',
  trendUp: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
  cart: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  scale: '<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1zM2 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1z"/><path d="M7 21h10M12 3v18M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>',
  hand: '<path d="M11 14h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 16"/><path d="m7 20 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9"/><path d="m2 15 6 6"/><circle cx="16" cy="9" r="2.9"/><circle cx="6" cy="5" r="3"/>',
  fileText: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>',
  percent: '<path d="M19 5 5 19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
};
const FLIP = new Set(['chevL', 'chevR', 'logout', 'undo', 'trendUp']);
const icon = (n, cls = '') => `<svg class="ic ${FLIP.has(n) ? 'flip' : ''} ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;

/* ═════════════════════════ appearance ═════════════════════════ */
// engine lives in look.js (loaded in <head>); these helpers wire it to the UI
const isDark = () => document.documentElement.dataset.theme === 'dark';
function toggleDark() {
  const L = LOOK.current().look;
  LOOK.savePersonal({ ...L, mode: isDark() ? 'light' : 'dark' });
  const tb = document.getElementById('themeToggle'); if (tb) tb.innerHTML = icon(isDark() ? 'sun' : 'moon');
}

/* ═════════════════════════ utilities ═════════════════════════ */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const M = (n) => `<span class="num">${money(n)}</span>`;
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const addDays = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const dayName = (s) => new Date(s + 'T12:00:00').toLocaleDateString(LANG === 'en' ? 'en-US' : 'ar-SA-u-ca-gregory-nu-latn', { weekday: 'long' });
const fmtDate = (s) => s ? `${dayName(s)} ${s}` : '';
const dayTag = (i) => {
  let t = i.nextElementSibling;
  if (!t || !t.classList.contains('dname')) { t = document.createElement('span'); t.className = 'dname'; i.after(t); }
  t.textContent = /^\d{4}-\d{2}-\d{2}$/.test(i.value) ? dayName(i.value) : '';
};
new MutationObserver(() => document.querySelectorAll('input[type=date]').forEach(i => { if (!i.dataset.dn) { i.dataset.dn = 1; dayTag(i); } }))
  .observe(document.documentElement, { childList: true, subtree: true });
document.addEventListener('input', (e) => { if (e.target.type === 'date') dayTag(e.target); });
document.addEventListener('change', (e) => { if (e.target.type === 'date') dayTag(e.target); });
const timeOf = (s) => s ? s.slice(11, 16) : '';
const opt = (list, sel, f = x => [x.id, T(x.name)]) => list.map(x => { const [v, l] = f(x); return `<option value="${esc(v)}" ${String(v) === String(sel ?? '') ? 'selected' : ''}>${esc(l)}</option>`; }).join('');
const formObj = (form) => Object.fromEntries(new FormData(form).entries());
const diffBadge = (d) => d === null || d === undefined ? '' : Math.abs(d) < 0.005 ? ("<span class=\"badge pos\">" + T("مطابق") + " ✓</span>") : d < 0 ? `<span class="badge neg">${T("عجز")} ${money(-d)}</span>` : `<span class="badge warn">${T("فائض")} ${money(d)}</span>`;

const S = { me: null, bid: null, meta: null };
const logoURL = (b) => b && b.logo_v ? `/api/b/${b.id}/logo?v=${b.logo_v}` : null;
const logoImg = (b, cls = 'blogo') => logoURL(b) ? `<img class="${cls}" src="${logoURL(b)}" alt="">` : '';
const curBiz = () => S.me && S.me.businesses.find(x => x.id === S.bid);
const can = (p) => !!S.meta && S.meta.permissions.includes(p);
// the business's current work day (a closing after midnight still belongs to the previous day)
const wd = () => (S.meta && S.meta.work_date) || S.me.today;
// a business is a restaurant (daily closing) or a family fund — each has its own pages and permissions
const isFund = () => S.meta?.business?.kind === 'fund';
const FUND_PERMS = ['fund_collect', 'fund_view_all', 'fund_manage'];
const permsFor = (kind) => Object.keys(S.me.permissions).filter(k => kind === 'fund' ? FUND_PERMS.includes(k) || k === 'audit_view' : !FUND_PERMS.includes(k));
// role shown for a user: owner (whole system) / business manager / cashier / fund supervisor / collector / member
function roleName(isAdmin, perms, kind) {
  if (isAdmin) return T("مالك النظام");
  if (kind === 'fund') return perms.includes('fund_manage') ? T("مشرف الصندوق") : perms.includes('fund_collect') ? T("محصّل") : perms.includes('fund_view_all') ? T("مراقب") : T("عضو");
  return permsFor('restaurant').every(k => perms.includes(k)) ? T("مدير النشاط")
    : perms.length && perms.every(k => ['purchases_add', 'shift_manage'].includes(k)) ? T("كاشير") : T("مستخدم");
}

async function api(path, opts = {}) {
  const res = await fetch('/api' + path, {
    method: opts.method || 'GET',
    // X-Requested-With: required by the server for any change (blocks cross-site request forgery)
    headers: { 'X-Lang': LANG, 'X-Requested-With': 'fetch', ...(opts.body ? { 'Content-Type': 'application/json' } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  let data = {};
  try { data = await res.json(); } catch { }
  if (res.status === 401 && path !== '/login') { showLogin(); throw new Error(data.error || T("انتهت الجلسة")); }
  if (!res.ok) throw new Error(data.error || T("حدث خطأ"));
  return data;
}
const bapi = (p, o) => api(`/b/${S.bid}${p}`, o);

function toast(msg, type = '') {
  const t = document.createElement('div');
  t.className = 'toast ' + type; t.innerHTML = icon(type === 'err' ? 'alert' : type === 'ok' ? 'check' : 'info') + '<span></span>'; t.lastChild.textContent = msg;
  $('#toasts').append(t);
  setTimeout(() => t.remove(), type === 'err' ? 5000 : 2800);
}
const fail = (e) => toast(e.message, 'err');

function modal(title, html, { wide = false } = {}) {
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal ${wide ? 'wide' : ''}"><div class="mh"><h3>${esc(title)}</h3><button class="icon-btn" data-x title="${T("إغلاق")}">${icon('x')}</button></div><div class="mb">${html}</div></div>`;
  const close = () => { bg.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  bg.addEventListener('click', (e) => { if (e.target === bg || e.target.closest('[data-x]')) close(); });
  document.addEventListener('keydown', onKey);
  document.body.append(bg);
  const f = $('input[name=amount], input:not([type]):not([readonly]), input[type=text]:not([readonly]), input[type=password], input[type=number]', bg);
  if (f) setTimeout(() => f.focus(), 30);
  return { el: $('.mb', bg), close };
}
function confirmBox(title, html, okText = T("تأكيد"), danger = false) {
  return new Promise((resolve) => {
    const m = modal(title, `${html}<div class="mf"><button class="btn ${danger ? 'danger' : 'primary'}" data-ok>${okText}</button><button class="btn" data-no>${T("إلغاء")}</button></div>`);
    $('[data-ok]', m.el).onclick = () => { m.close(); resolve(true); };
    $('[data-no]', m.el).onclick = () => { m.close(); resolve(false); };
  });
}
// guard against double-submit
async function busy(btn, fn) {
  if (btn.disabled) return;
  btn.disabled = true;
  try { await fn(); } catch (e) { fail(e); } finally { btn.disabled = false; }
}
function downloadCSV(name, rows) {
  const csv = '﻿' + rows.map(r => r.map(c => { const s = String(c ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(',')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = name; a.click();
}

/* ═════════════════════════ login & shell ═════════════════════════ */
const themeBtn = () => `<button type="button" class="icon-btn" id="themeToggle" title="${T("الوضع الليلي")}" onclick="toggleDark()">${icon(isDark() ? 'sun' : 'moon')}</button>`;

function showLogin() {
  S.me = null;
  $('#app').innerHTML = `<div class="login"><form class="box" id="fLogin">
    <div class="lg-ic">${icon('store')}</div>
    <h1>${T("نظام الإقفال اليومي")}</h1><p>${T("سجّل الدخول للمتابعة")}</p>
    <label>${T("اسم المستخدم")}<input name="username" autocomplete="username" required></label>
    <label>${T("كلمة المرور")}<input name="password" type="password" autocomplete="current-password" required></label>
    <div class="err" id="lerr"></div>
    <button class="btn primary block">${T("دخول")}</button>
    <button type="button" class="btn sm ghost block" id="bForgot" style="margin-top:10px">${T("نسيت كلمة المرور؟")}</button>
    <div class="login-tools">${langBtn('btn sm ghost')}${themeBtn()}</div></form></div>`;
  $('#fLogin').onsubmit = async (e) => {
    e.preventDefault();
    try { await api('/login', { method: 'POST', body: formObj(e.target) }); await boot(); }
    catch (err) { $('#lerr').textContent = err.message; }
  };
  $('#bForgot').onclick = () => {
    const m = modal(T("نسيت كلمة المرور؟"), `<form autocomplete="off"><p class="small">${T("اكتب اسم الدخول، وسيصل تنبيه للمدير ليعيّن لك كلمة مرور جديدة ويرسلها لك")}.</p>
      <label>${T("اسم المستخدم")}<input name="username" required dir="ltr" value="${esc($('#fLogin').username.value)}"></label>
      <div class="mf"><button class="btn primary">${icon('check')}${T("إرسال الطلب")}</button></div></form>`);
    $('form', m.el).onsubmit = (e) => { e.preventDefault(); busy(e.submitter, async () => {
      await api('/forgot', { method: 'POST', body: formObj(e.target) });
      m.close(); modal(T("تم إرسال الطلب"), `<div class="result"><div class="res-ic">${icon('check')}</div><p>${T("وصل طلبك للمدير. سيعيّن لك كلمة مرور جديدة ويرسلها لك، وبعد الدخول تستطيع تغييرها من زر المفتاح 🔑")}.</p></div><div class="mf"><button class="btn primary block" data-x>${T("تم")}</button></div>`);
    }); };
  };
  $('#fLogin input').focus();
}

// still on the factory password: nothing else is allowed until it is changed
function forcePasswordChange() {
  $('#app').innerHTML = `<div class="login"><form class="box" id="fForce" autocomplete="off">
    <div class="lg-ic" style="background:var(--warn)">${icon('key')}</div>
    <h1>${T("غيّر كلمة المرور")}</h1><p>${T("أنت تستخدم كلمة المرور الافتراضية. لحماية بياناتك يجب تغييرها قبل المتابعة")}.</p>
    <label>${T("كلمة المرور الحالية")}<input type="password" name="current" required autocomplete="current-password"></label>
    <label>${T("كلمة المرور الجديدة")}<input type="password" name="password" required minlength="6" autocomplete="new-password"></label>
    <label>${T("تأكيد كلمة المرور الجديدة")}<input type="password" name="password2" required autocomplete="new-password"></label>
    <div class="err" id="ferr"></div>
    <button class="btn primary block">${icon('check')}${T("حفظ ومتابعة")}</button>
    <div class="login-tools"><button type="button" class="btn sm ghost" id="fOut">${icon('logout')}${T("خروج")}</button></div></form></div>`;
  $('#fOut').onclick = async () => { await api('/logout', { method: 'POST' }).catch(() => { }); showLogin(); };
  $('#fForce').onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    if (f.password.value !== f.password2.value) { $('#ferr').textContent = T("كلمتا المرور غير متطابقتين"); return; }
    try { await api('/me/password', { method: 'POST', body: { current: f.current.value, password: f.password.value } }); toast(T("تم تغيير كلمة المرور"), 'ok'); boot(); }
    catch (err) { $('#ferr').textContent = err.message; }
  };
}

async function boot() {
  try { S.me = await api('/me'); } catch { return; }
  if (S.me.user.must_change) return forcePasswordChange();
  const saved = Number(localStorage.getItem('bid'));
  const b = S.me.businesses.find(x => x.id === saved) || S.me.businesses[0];
  S.bid = b ? b.id : null;
  if (S.bid) await loadMeta();
  renderShell();
  if (!location.hash) location.hash = defaultRoute();
  route();
}
async function loadMeta() { S.meta = await bapi('/meta'); LOOK.setBusiness(S.meta.business.theme || {}); }

// a cashier (no management permission at all) gets a single simplified page
const MGMT_PERMS = ['tx_view_all', 'tx_edit', 'reports_view', 'balance_view', 'finance_manage', 'shift_reopen', 'settings_manage', 'audit_view'];
const isSimple = () => !!S.me && !S.me.user.is_admin && !!S.meta && !isFund() && !MGMT_PERMS.some(can);
// pages reached by a link (not in the menu): name → visible?
const EXTRA_ROUTES = {};
// [route, label, visible?, icon, group]
const NAV = [
  ['home', T("الرئيسية"), () => !isFund() && can('balance_view'), 'home', 'day'],
  ['shift', T("اليوم (المشتريات والإقفال)"), () => !!S.bid && !isFund(), 'receipt', 'day'],
  ['tx', T("الحركات"), () => !isFund() && can('tx_view_all'), 'list', 'day'],
  ['expenses', T("المصروفات"), () => !isFund() && can('tx_view_all'), 'fileText', 'day'],
  ['shifts', T("سجل الإقفالات"), () => !isFund() && (can('reports_view') || can('shift_reopen')), 'clipboard', 'day'],
  ['reports', T("التقارير"), () => !isFund() && can('reports_view'), 'chart', 'fin'],
  ['finance', T("التحصيل والديون"), () => !isFund() && can('balance_view'), 'wallet', 'fin'],
  ['audit', T("سجل التعديلات"), () => can('audit_view'), 'history', 'fin'],
  ['settings', T("إعدادات النشاط"), () => !isFund() && can('settings_manage'), 'sliders', 'adm'],
  ['admin', T("المستخدمون والأنشطة"), () => S.me.user.is_admin, 'users', 'adm'],
];
const NAV_GROUPS = { day: T("العمل اليومي"), fin: T("التقارير والمالية"), adm: T("الإدارة") };
const defaultRoute = () => '#/' + (isFund() ? 'fund' : can('balance_view') ? 'home' : S.bid ? 'shift' : 'admin');
// Arabic names: skip the article "ال" so "المدير" shows "م" (a bare alif looks like "I")
const initials = (n) => { const w = String(n || '?').trim().split(/\s+/).filter(x => !['بن', 'بنت', 'ابن', 'آل', 'ال'].includes(x)); return (w.length ? w : ['?']).map(x => x.replace(/^ال(?=..)/, '')[0]).slice(0, 2).join(''); };
const bizLogoBox = (b) => `<div class="biz-logo" id="hLogo">${logoURL(b) ? `<img src="${logoURL(b)}" alt="">` : icon('store')}</div>`;
function refreshHeaderLogo() { const el = $('#hLogo'); if (el) el.outerHTML = bizLogoBox(curBiz()); const n = $('#hBizName'); if (n) n.textContent = T(curBiz()?.name || ''); }

function renderShell() {
  const bs = S.me.businesses, simple = isSimple();
  const role = roleName(S.me.user.is_admin, S.meta ? S.meta.permissions : [], S.meta?.business?.kind);
  const bizSel = bs.length > 1 ? `<select id="bizSel" class="biz-sel">${opt(bs, S.bid)}</select>` : '';
  $('#app').innerHTML = `<div class="layout ${simple ? 'simple' : ''}">
    <aside class="side" id="side">
      <div class="side-head">
        <div class="brandline">${bizLogoBox(curBiz())}<div class="bt"><b id="hBizName">${esc(T(curBiz()?.name || ''))}</b><span>${isFund() ? T("صندوق العائلة") : T("الإقفال اليومي")}</span></div></div>
        ${bizSel}
      </div>
      <nav class="side-nav" id="nav"></nav>
      <div class="side-foot">
        <div class="me"><div class="avatar">${esc(initials(S.me.user.name))}</div><div><b>${esc(S.me.user.name)}</b><span>${role}</span></div></div>
        <button class="btn sm pw-btn" id="bPw">${icon('key')}${T("تغيير كلمة المرور")}</button>
        <div class="foot-btns">
          <button class="icon-btn" id="bLook" title="${T("المظهر")}">${icon('palette')}</button>
          ${langBtn('icon-btn')}
          <button class="icon-btn danger" id="bOut" title="${T("خروج")}">${icon('logout')}</button>
        </div>
      </div>
    </aside>
    <div class="scrim" id="scrim"></div>
    <div class="main-wrap">
      <header class="topbar">
        <button class="icon-btn menu-btn" id="bMenu" title="${T("القائمة")}">${icon('menu')}</button>
        ${simple ? `<div class="biz-mini">${bizLogoBox(curBiz())}<b>${esc(T(curBiz()?.name || ''))}</b></div>${bizSel}` : `<div class="crumb" id="crumb"></div>`}
        <div class="spacer"></div>
        <span class="chip">${fmtDate(wd())}</span>
        <button class="icon-btn bell" id="bBell" title="${T("التنبيهات")}">${icon('bell')}<span class="bdg" id="bellN" hidden></span></button>
        ${themeBtn()}
        ${simple ? `<button class="icon-btn" id="bLook2" title="${T("المظهر")}">${icon('palette')}</button>${langBtn('icon-btn')}<button class="icon-btn" id="bPw2" title="${T("تغيير كلمة المرور")}">${icon('key')}</button><button class="icon-btn danger" id="bOut2" title="${T("خروج")}">${icon('logout')}</button>` : ''}
      </header>
      <main id="view"></main>
    </div>
  </div>`;
  // the language button in the compact spots shows only its icon
  $$('.foot-btns [onclick^=setLang] span, .topbar [onclick^=setLang] span').forEach(s => s.remove());
  renderNav();
  $$('#bizSel').forEach(sel => sel.onchange = async (e) => {
    S.bid = Number(e.target.value); localStorage.setItem('bid', S.bid);
    await loadMeta(); renderShell(); location.hash = defaultRoute(); route();
  });
  const logout = async () => { await api('/logout', { method: 'POST' }).catch(() => { }); showLogin(); };
  $$('#bOut, #bOut2').forEach(b => b.onclick = logout);
  $$('#bLook, #bLook2').forEach(b => b.onclick = openAppearance);
  $$('#bPw, #bPw2').forEach(b => b.onclick = changePassword);
  $('#bBell').onclick = (e) => { e.stopPropagation(); openBell(); };
  refreshBell();
  const side = $('#side'), scrim = $('#scrim');
  const toggle = (open) => { side.classList.toggle('open', open); scrim.classList.toggle('open', open); };
  $('#bMenu').onclick = () => toggle(!side.classList.contains('open'));
  scrim.onclick = () => toggle(false);
  $('#nav').addEventListener('click', (e) => { if (e.target.closest('a')) toggle(false); });
  if (simple) $('#bMenu').hidden = true;
}
function renderNav() {
  const cur = (location.hash.split('/')[1] || '');
  const items = NAV.filter(n => n[2]());
  let html = '', grp = '';
  for (const n of items) {
    if (n[4] !== grp) { grp = n[4]; html += `<div class="grp">${NAV_GROUPS[grp]}</div>`; }
    html += `<a href="#/${n[0]}" class="${cur === n[0] ? 'on' : ''}">${icon(n[3])}<span>${n[1]}</span></a>`;
  }
  $('#nav').innerHTML = html;
  const item = NAV.find(n => n[0] === cur);
  if ($('#crumb') && item) $('#crumb').innerHTML = `${icon(item[3])}<span>${item[1]}</span>`;
}
// consistent page header: icon tile + title + optional subtitle + action buttons
const pageHead = (ic, title, sub = '', acts = '', cls = '') => `<div class="page-head ${cls}"><div class="ph-ic">${icon(ic)}</div>
  <div class="ph-t"><h1>${title}</h1>${sub ? `<div class="ph-sub">${sub}</div>` : ''}</div>${acts ? `<div class="acts">${acts}</div>` : ''}</div>`;

function changePassword() {
  const m = modal(T("تغيير كلمة المرور"), `<form id="fPw">
    <label>${T("كلمة المرور الحالية")}<input type="password" name="current" required></label>
    <label>${T("كلمة المرور الجديدة")}<input type="password" name="password" minlength="6" required autocomplete="new-password"></label>
    <label>${T("تأكيد كلمة المرور الجديدة")}<input type="password" name="password2" minlength="6" required autocomplete="new-password"></label>
    <p class="hint">${icon('info')}<span>${T("نسيت كلمتك الحالية؟ اطلب من المدير تعيين كلمة جديدة لك")}.</span></p>
    <div class="mf"><button class="btn primary">${icon('check')}${T("حفظ")}</button></div></form>`);
  $('#fPw', m.el).onsubmit = (e) => {
    e.preventDefault();
    const f = e.target;
    if (f.password.value !== f.password2.value) return toast(T("كلمتا المرور غير متطابقتين"), 'err');
    busy(e.submitter, async () => { await api('/me/password', { method: 'POST', body: { current: f.current.value, password: f.password.value } }); m.close(); toast(T("تم تغيير كلمة المرور"), 'ok'); });
  };
}

/* ───── notifications (bell) ───── */
const fillT = (title, vars = {}) => esc(T(title)).replace(/\{(\w+)\}/g, (_, k) => { const v = vars[k]; return typeof v === 'number' ? money(v) : k === 'month' && /^\d{4}-\d{2}$/.test(v || '') && typeof monLabel === 'function' ? monLabel(v) : esc(v ?? ''); });
async function refreshBell() {
  clearTimeout(refreshBell.t);
  if (!S.me) return; // signed out: stop checking
  try {
    const d = await api('/notifications');
    S.bell = d;
    const n = $('#bellN');
    if (n) { n.hidden = !d.unread; n.textContent = d.unread > 9 ? '9+' : d.unread; }
  } catch { }
  refreshBell.t = setTimeout(refreshBell, 60e3);
}
async function openBell() {
  const old = $('.npanel'); if (old) { old.remove(); return; }
  await refreshBell();
  const d = S.bell || { items: [], unread: 0 };
  const p = document.createElement('div');
  p.className = 'npanel';
  p.innerHTML = `<div class="np-h"><b>${T("التنبيهات")}</b>${d.unread ? `<button class="btn sm ghost" data-all>${T("تحديد الكل كمقروء")}</button>` : ''}</div>
    <div class="np-list">${d.items.length ? d.items.map(n => `<button type="button" class="np-item ${n.read_at ? '' : 'new'}" data-n="${n.id}">
      <span class="np-ic">${icon(n.kind === 'fund_receipt' ? 'receipt' : n.kind === 'fund_statement' ? 'fileText' : n.kind === 'fund_gift' ? 'heart' : n.kind === 'pw_reset' ? 'key' : /rejected|report_reject/.test(n.kind) ? 'x' : /approved|report_approve/.test(n.kind) ? 'check' : n.kind === 'report_requested' ? 'eye' : 'hand')}</span>
      <span class="np-t"><span>${fillT(n.title, n.vars)}</span>${n.vars && n.vars.note ? `<small class="muted">${esc(n.vars.note)}</small>` : ''}
        <small class="muted">${n.business_name ? esc(T(n.business_name)) + ' · ' : ''}${n.created_at.slice(0, 16)}</small></span></button>`).join('')
      : `<div class="empty small">${T("لا توجد تنبيهات")}</div>`}</div>`;
  document.body.append(p);
  const close = (e) => { if (!p.contains(e.target) && !e.target.closest('#bBell')) { p.remove(); document.removeEventListener('click', close); } };
  setTimeout(() => document.addEventListener('click', close), 0);
  const all = $('[data-all]', p);
  if (all) all.onclick = async () => { await api('/notifications/read', { method: 'POST', body: { all: true } }); p.remove(); refreshBell(); };
  $$('[data-n]', p).forEach(b => b.onclick = async () => {
    const n = d.items.find(x => x.id == b.dataset.n);
    p.remove(); document.removeEventListener('click', close);
    if (!n.read_at) await api('/notifications/read', { method: 'POST', body: { ids: [n.id] } }).catch(() => { });
    // open the right business first, then the page
    if (n.business_id && n.business_id !== S.bid && S.me.businesses.some(x => x.id === n.business_id)) {
      S.bid = n.business_id; localStorage.setItem('bid', S.bid); await loadMeta(); renderShell();
    }
    if (n.link) { if (location.hash === n.link) route(); else location.hash = n.link; }
    refreshBell();
  });
}

// appearance window: ready-made themes + every detail; changes apply live.
// Saved on this device; the owner can also make it the default for everyone in the business.
function openAppearance() {
  const C = LOOK.current();
  let L = { ...C.look };
  const bizLook = S.meta && S.meta.business.theme;
  const canBiz = can('settings_manage');
  Object.keys(LOOK.FONTS).forEach(LOOK.loadFont); // so the font list previews in its own font
  const THEMES = { classic: T("كلاسيكي"), navy: T("ليلي أزرق"), sand: T("رملي"), ocean: T("محيطي"), forest: T("غابة"), rose: T("وردي"), royal: T("ملكي"), pro: T("احترافي") };
  const COLORS = { teal: T("أخضر مزرق"), emerald: T("زمردي"), green: T("أخضر"), olive: T("زيتي"), sky: T("سماوي"), blue: T("أزرق"), indigo: T("نيلي"), violet: T("بنفسجي غامق"), purple: T("بنفسجي"), pink: T("زهري"), rose: T("وردي"), maroon: T("عنابي"), red: T("أحمر"), orange: T("برتقالي"), amber: T("كهرماني"), gold: T("ذهبي"), brown: T("بني"), slate: T("رمادي"), graphite: T("فحمي") };
  const FONT_N = { plex: 'IBM Plex Arabic', tajawal: 'Tajawal — تجوال', cairo: 'Cairo — القاهرة', almarai: 'Almarai — المراعي', kufi: 'Noto Kufi — كوفي' };
  const seg = (name, opts) => `<div class="seg full-seg">${opts.map(([v, l, ic]) => `<label><input type="radio" name="${name}" value="${v}"><span>${ic ? icon(ic) : ''}${l}</span></label>`).join('')}</div>`;
  // little picture of each ready-made theme
  const pv = (p) => {
    const dark = p.mode === 'dark';
    const bg = dark ? (p.bg === 'warm' ? '#1c1813' : '#141a22') : p.bg === 'warm' ? '#f5efe4' : p.bg === 'tint' ? `color-mix(in srgb, ${p.accent} 9%, #f5f6f8)` : p.bg === 'white' ? '#fff' : '#f1f4f7';
    const side = p.side === 'brand' ? p.accent : p.side === 'dark' ? '#111827' : dark ? '#19212b' : '#ffffff';
    const card = dark ? '#202a35' : '#ffffff';
    return `<div class="pv" style="background:${bg}"><div class="ps" style="background:${side}"></div><div class="pm"><div class="pc" style="background:${card}"></div><div class="pc" style="background:${card}"></div><div class="pb" style="background:${p.accent}"></div></div></div>`;
  };
  const m = modal(T("المظهر"), `
    <div class="ap-sec full"><h4>${T("ثيمات جاهزة")}</h4><div class="themes">
      ${Object.entries(LOOK.PRESETS).map(([k, p]) => `<button type="button" class="theme-card" data-preset="${k}">${pv(p)}<b>${p.mode === 'dark' ? icon('moon') : icon('sun')}${THEMES[k]}</b></button>`).join('')}
    </div></div>
    <div class="ap-grid">
      <div>
        <div class="ap-sec"><h4>${T("الوضع")}</h4>${seg('mode', [['light', T("فاتح"), 'sun'], ['dark', T("ليلي"), 'moon'], ['auto', T("تلقائي"), 'monitor']])}</div>
        <div class="ap-sec"><h4>${T("لون الموقع")}</h4><div class="swatches">
          ${Object.entries(LOOK.PALETTE).map(([k, c]) => `<button type="button" class="swatch" data-acc="${c}" title="${COLORS[k]}" style="background:${c}"></button>`).join('')}
          <label class="swatch custom" title="${T("لون مخصص")}"><input type="color" id="accCustom"></label>
        </div></div>
        <div class="ap-sec"><h4>${T("الخلفية")}</h4>${seg('bg', [['neutral', T("هادئة")], ['tint', T("ملوّنة")], ['white', T("بيضاء")], ['warm', T("دافئة")]])}</div>
        <div class="ap-sec"><h4>${T("القائمة الجانبية")}</h4>${seg('side', [['light', T("فاتحة")], ['brand', T("بلون الموقع")], ['dark', T("داكنة")]])}</div>
      </div>
      <div>
        <div class="ap-sec"><h4>${T("الخط")}</h4><div class="fonts">
          ${Object.keys(LOOK.FONTS).map(k => `<button type="button" class="font-opt" data-font="${k}" style="font-family:${LOOK.FONTS[k][0]}"><span>${T("الإقفال اليومي")} 1,250.75</span><small>${FONT_N[k]}</small></button>`).join('')}
        </div></div>
        <div class="ap-sec"><h4>${T("الحواف")}</h4>${seg('radius', [['sm', T("حادة")], ['md', T("متوسطة")], ['lg', T("دائرية")]])}</div>
        <div class="ap-sec"><h4>${T("حجم الخط")}</h4>${seg('size', [['md', T("عادي")], ['lg', T("كبير")]])}</div>
        <div class="ap-sec"><h4>${T("المسافات")}</h4>${seg('density', [['comfy', T("مريحة")], ['compact', T("مضغوطة")]])}</div>
      </div>
    </div>
    <p class="muted small" id="apNote"></p>
    <div class="ap-foot">
      <button class="btn primary" data-x>${icon('check')}${T("تم")}</button>
      <span class="grow"></span>
      ${canBiz ? `<button class="btn soft" id="apBiz">${icon('users')}${T("اعتماده لكل مستخدمي النشاط")}</button>` : ''}
      <button class="btn" id="apReset">${icon('undo')}${bizLook ? T("استخدام مظهر النشاط") : T("الافتراضي")}</button>
    </div>`, { wide: true });
  const sync = () => {
    for (const k of ['mode', 'bg', 'side', 'radius', 'size', 'density']) $$(`[name=${k}]`, m.el).forEach(r => { r.checked = r.value === L[k]; });
    $$('[data-acc]', m.el).forEach(b => { const on = b.dataset.acc.toLowerCase() === String(L.accent).toLowerCase(); b.classList.toggle('on', on); b.innerHTML = on ? icon('check') : ''; });
    $('#accCustom', m.el).value = L.accent;
    $$('[data-font]', m.el).forEach(b => b.classList.toggle('on', b.dataset.font === L.font));
    $$('[data-preset]', m.el).forEach(b => { const p = LOOK.PRESETS[b.dataset.preset]; b.classList.toggle('on', Object.keys(p).every(k => String(p[k]).toLowerCase() === String(L[k]).toLowerCase())); });
    $('#apNote', m.el).textContent = T("يُحفظ المظهر على هذا الجهاز فقط — كل موظف يختار ما يناسبه") + '.';
    const tb = document.getElementById('themeToggle'); if (tb) tb.innerHTML = icon(isDark() ? 'sun' : 'moon');
  };
  const set = (patch) => { L = { ...L, ...patch }; LOOK.savePersonal(L); sync(); };
  m.el.addEventListener('change', (e) => { const n = e.target.name; if (['mode', 'bg', 'side', 'radius', 'size', 'density'].includes(n)) set({ [n]: e.target.value }); });
  $$('[data-acc]', m.el).forEach(b => b.onclick = () => set({ accent: b.dataset.acc }));
  $('#accCustom', m.el).oninput = (e) => set({ accent: e.target.value });
  $$('[data-font]', m.el).forEach(b => b.onclick = () => set({ font: b.dataset.font }));
  $$('[data-preset]', m.el).forEach(b => b.onclick = () => set(LOOK.PRESETS[b.dataset.preset]));
  $('#apReset', m.el).onclick = () => { LOOK.clearPersonal(); L = { ...LOOK.current().look }; sync(); toast(T("تم"), 'ok'); };
  if ($('#apBiz', m.el)) $('#apBiz', m.el).onclick = () => busy($('#apBiz', m.el), async () => {
    await bapi('/theme', { method: 'PUT', body: LOOK.clean(L) });
    S.meta.business.theme = LOOK.clean(L); LOOK.setBusiness(S.meta.business.theme);
    toast(T("تم اعتماد المظهر لكل مستخدمي النشاط"), 'ok');
  });
  sync();
}

const VIEWS = {};
async function route() {
  if (!S.me) return;
  const [, name = '', ...rest] = location.hash.split('/');
  const item = NAV.find(n => n[0] === name) || (EXTRA_ROUTES[name] && [name, '', EXTRA_ROUTES[name]]);
  if (!item || !item[2]()) { location.hash = defaultRoute(); return; }
  renderNav();
  const el = $('#view');
  el.innerHTML = `<div class="empty">${T("جاري التحميل…")}</div>`;
  try { await VIEWS[name](el, rest); } catch (e) { el.innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);


/* ═════════════════════════ transaction form (shared) ═════════════════════════ */
const TX_HINT = {
  purchase: { drawer: (T("يُخصم من نقد الدرج ويدخل في جرد الشفت تلقائياً") + "."), company: (T("يُخصم من رصيد الشركة ولا يؤثر على الدرج") + "."), credit: (T("لا يمس الرصيد — يُضاف على حساب الدائن/المورد كدين") + ".") },
  expense: { drawer: (T("يُخصم من نقد الدرج ويدخل في جرد الشفت تلقائياً") + "."), company: (T("يُخصم من رصيد الشركة ولا يؤثر على الدرج") + "."), credit: (T("لا يمس الرصيد — يُضاف على حساب الدائن كدين") + ".") },
  debt_payment: (T("يُخصم من الرصيد ويُنقص دين الدائن") + "."),
  loan: (T("مبلغ دخل للنشاط كدين (من صندوق العائلة أو جهة تمويل): يزيد الرصيد ويزيد الدين") + "."),
  owner_deposit: (T("مبلغ يضخه المالك في النشاط (ليس ديناً): يزيد الرصيد") + "."),
  withdrawal: (T("مبلغ يسحبه المالك من النشاط: يُخصم من الرصيد") + "."),
  app_settlement: (T("عند وصول تحويل من تطبيق التوصيل: أدخل المبلغ الواصل فعلاً والعمولة المخصومة. يُنقص آجل التطبيق بمجموعهما وتُخصم العمولة من الرصيد") + "."),
  debt_writeoff: (T("عندما يتنازل الدائن عن جزء من الدين أو كله بدون دفع: يُنقص الدين ولا يمس رصيد الشركة") + "."),
  adjustment: (T("لتصحيح الرصيد يدوياً: مبلغ موجب للزيادة وسالب للنقص. اكتب السبب في الملاحظة") + "."),
};

/* ───── itemized invoice editor: item × qty × price → line total → invoice total ───── */
const itemsEditorHTML = () => `<div class="items">
  <div class="it-row it-head"><span>${T("الصنف")}</span><span>${T("الكمية")}</span><span>${T("السعر")}</span><span>${T("المجموع")}</span><span></span></div>
  <div class="it-rows"></div>
  <div class="row" style="justify-content:space-between;margin-top:8px"><button type="button" class="btn sm soft" data-add-item>${icon('plus')}${T("صنف")}</button>
  <span>${T("إجمالي الفاتورة:")} <b class="num" data-it-total>0.00</b></span></div></div>`;
function bindItems(box, items = [], onChange) {
  const rows = $('.it-rows', box);
  const val = (r, k) => $(`[data-k=${k}]`, r).value;
  const calc = () => {
    let t = 0;
    $$('.it-row', rows).forEach(r => { const s = r2(r2(val(r, 'qty')) * r2(val(r, 'price'))); $('.it-sum', r).textContent = money(s); t += s; });
    $('[data-it-total]', box).textContent = money(t);
    onChange && onChange(r2(t));
  };
  const addRow = (it = {}) => {
    const d = document.createElement('div');
    d.className = 'it-row';
    d.innerHTML = `<input data-k="name" placeholder="${T("اسم الصنف — مثال: طماطم")}" value="${esc(it.name || '')}">
      <input data-k="qty" type="number" step="0.01" min="0" inputmode="decimal" value="${it.qty ?? 1}" title="${T("الكمية")}">
      <input data-k="price" type="number" step="0.01" min="0" inputmode="decimal" placeholder="${T("السعر")}" value="${it.price ?? ''}" title="${T("السعر")}">
      <span class="num it-sum">0.00</span><button type="button" class="icon-btn danger" data-rm title="${T("حذف السطر")}">${icon('x')}</button>`;
    rows.append(d); calc();
    return d;
  };
  rows.addEventListener('input', calc);
  rows.addEventListener('click', (e) => { if (e.target.closest('[data-rm]')) { e.target.closest('.it-row').remove(); if (!$('.it-row', rows)) addRow(); calc(); } });
  // Enter on the price jumps to a new line — fast entry from a paper invoice
  rows.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.dataset.k === 'price') { e.preventDefault(); $('[data-k=name]', addRow()).focus(); } });
  $('[data-add-item]', box).onclick = () => $('[data-k=name]', addRow()).focus();
  (items.length ? items : [{}]).forEach(addRow);
  const read = () => $$('.it-row', rows).map(r => ({ name: val(r, 'name').trim(), qty: val(r, 'qty') === '' ? 1 : r2(val(r, 'qty')), price: r2(val(r, 'price')) })).filter(i => i.name || i.price);
  return { read, total: () => r2(read().reduce((t, i) => t + r2(i.qty * i.price), 0)) };
}
const itemsHTML = (items) => items && items.length ? `<details class="itd"><summary>${icon('package')} ${items.length} ${items.length > 2 ? T("أصناف") : T("صنف")}</summary>
  <table>${items.map(i => `<tr><td>${esc(T(i.name))}</td><td class="num">${i.qty} × ${money(i.price)}</td><td class="num">${money(i.total)}</td></tr>`).join('')}</table></details>` : '';

function txFormHTML(opts = {}) {
  const types = opts.types || (can('finance_manage') ? Object.keys(S.me.txTypes) : ['purchase', 'expense']);
  return `<form class="txf">
    <div class="seg" ${types.length < 2 ? 'hidden' : ''}>${types.map((k, i) => `<label><input type="radio" name="type" value="${k}" ${i === 0 ? 'checked' : ''}><span>${S.me.txTypes[k]}</span></label>`).join('')}</div>
    <div class="fgrid">
      <label data-f="app">${T("التطبيق")}<select name="app_id">${opt(S.meta.apps.filter(a => a.active))}</select></label>
      <label class="big"><span data-amt-l>${T("المبلغ")}</span><input name="amount" type="number" step="0.01" inputmode="decimal" required></label>
      <label data-f="fee">${T("عمولة التطبيق المخصومة")}<input name="fee" type="number" step="0.01" min="0" inputmode="decimal" value="0"></label>
      <label data-f="cat">${T("التصنيف")}<select name="category_id"></select></label>
      <label data-f="supplier">${T("المورد")}<input name="supplier" list="dl-sup"></label>
      <label data-f="invoice">${T("رقم الفاتورة")}<input name="invoice_no"></label>
      <label data-f="method">${T("طريقة الدفع")}<select name="payment_method"></select></label>
      <label data-f="cardpart"><span>${T("منها مدفوع شبكة")} <span class="opt">${T("(اختياري)")}</span></span><input name="card_part" type="number" step="0.01" min="0" inputmode="decimal" placeholder="0"></label>
      <label data-f="creditor">${T("الدائن / المورد")}<select name="creditor_id"><option value="">— ${T("اختر")} —</option>${opt(S.meta.creditors.filter(c => c.active))}</select></label>
      <label data-f="date">${T("التاريخ")}<input type="date" name="date" value="${wd()}"></label>
      <label class="full">${T("ملاحظة / البيان")}<input name="description"></label>
    </div>
    <div data-f="items" style="margin-top:12px"><label class="check"><input type="checkbox" data-items-toggle> ${T("تفصيل الفاتورة بالأصناف (يُحسب المبلغ تلقائياً)")}</label>
      <div class="items-box" hidden>${itemsEditorHTML()}</div></div>
    <p class="hint" data-hint></p>
    <div class="mf"><button class="btn primary">${opts.submitText || T("حفظ")}</button>${opts.cancel ? ("<button type=\"button\" class=\"btn\" data-x>" + T("إلغاء") + "</button>") : ''}</div>
  </form>`;
}
function bindTxForm(form, { tx = null, onSaved } = {}) {
  const finance = can('finance_manage');
  const sync = () => {
    const type = form.type.value;
    const methods = [];
    if (['purchase', 'expense', 'debt_payment', 'withdrawal', 'loan', 'owner_deposit'].includes(type) ) methods.push('drawer');
    if (finance) methods.push('company');
    if (finance && ['purchase', 'expense'].includes(type)) methods.push('credit');
    const curM = form.payment_method.value;
    const mLabels = { ...S.me.methods };
    if (['loan', 'owner_deposit'].includes(type)) { mLabels.drawer = T("دخل للدرج (كاش)"); mLabels.company = T("دخل لحساب الشركة"); }
    form.payment_method.innerHTML = methods.map(m => `<option value="${m}">${mLabels[m]}</option>`).join('');
    if (methods.includes(curM)) form.payment_method.value = curM;
    const method = form.payment_method.value;
    const kind = type === 'expense' ? 'expense' : 'purchase';
    const curC = form.category_id.value;
    form.category_id.innerHTML = ("<option value=\"\">— " + T("بدون") + " —</option>") + opt(S.meta.categories.filter(c => c.kind === kind && (c.active || String(c.id) === curC)));
    form.category_id.value = curC && $(`option[value="${curC}"]`, form.category_id) ? curC : '';
    const show = {
      items: ['purchase', 'expense'].includes(type),
      app: type === 'app_settlement', fee: type === 'app_settlement',
      cat: ['purchase', 'expense'].includes(type), supplier: type === 'purchase', invoice: ['purchase', 'expense'].includes(type),
      method: !['app_settlement', 'adjustment', 'debt_writeoff'].includes(type) && methods.length > 0,
      creditor: method === 'credit' || ['loan', 'debt_payment', 'debt_writeoff'].includes(type),
      date: method !== 'drawer' || ['app_settlement', 'adjustment', 'debt_writeoff'].includes(type),
      cardpart: method === 'drawer' && ['purchase', 'expense'].includes(type),
    };
    for (const [k, v] of Object.entries(show)) $(`[data-f="${k}"]`, form).hidden = !v;
    $('[data-amt-l]', form).textContent = type === 'app_settlement' ? T("المبلغ الواصل (الصافي)") : type === 'adjustment' ? T("مبلغ التسوية (+/−)") : T("المبلغ");
    form.amount.min = type === 'adjustment' ? '' : '0.01';
    const h = TX_HINT[type];
    $('[data-hint]', form).textContent = typeof h === 'object' ? (h[method] || '') : h || '';
  };
  if (tx) {
    form.type.value = tx.type;
    for (const k of ['amount', 'fee', 'supplier', 'invoice_no', 'description', 'date', 'app_id', 'creditor_id']) if (form[k] && tx[k] != null) form[k].value = tx[k];
    if (tx.card_part) form.card_part.value = tx.card_part;
    sync();
    form.payment_method.value = tx.payment_method;
    if (tx.category_id) { form.category_id.value = tx.category_id; }
  }
  form.addEventListener('change', (e) => { if (['type', 'payment_method'].includes(e.target.name)) sync(); });
  sync();
  // optional itemized lines
  const tog = $('[data-items-toggle]', form), ibox = $('.items-box', form);
  let editor = null;
  const setItems = (on, items = []) => {
    tog.checked = on; ibox.hidden = !on; form.amount.readOnly = on;
    if (on && !editor) editor = bindItems(ibox, items, (t) => { form.amount.value = t || ''; });
  };
  tog.onchange = () => setItems(tog.checked);
  if (tx && tx.items && tx.items.length) setItems(true, tx.items);
  form.onsubmit = (e) => {
    e.preventDefault();
    busy(e.submitter || $('button.primary', form), async () => {
      const body = formObj(form);
      body.card_part = $('[data-f=cardpart]', form).hidden ? 0 : r2(body.card_part);
      if (!$('[data-f=items]', form).hidden) body.items = tog.checked && editor ? editor.read() : [];
      if (tx) await bapi('/transactions/' + tx.id, { method: 'PUT', body });
      else await bapi('/transactions', { method: 'POST', body });
      toast(T("تم الحفظ"), 'ok');
      onSaved && onSaved();
    });
  };
  supplierMemory(form);
}
// remembers supplier names typed on this device and suggests them next time
function supplierMemory(form) {
  if (!$('#dl-sup')) { const dl = document.createElement('datalist'); dl.id = 'dl-sup'; document.body.append(dl); }
  let sup = [];
  try { sup = JSON.parse(localStorage.getItem('sup-' + S.bid) || '[]'); } catch { }
  $('#dl-sup').innerHTML = sup.map(s => `<option value="${esc(s)}">`).join('');
  form.addEventListener('submit', () => {
    const v = form.supplier.value.trim();
    if (v && !sup.includes(v)) { sup.unshift(v); try { localStorage.setItem('sup-' + S.bid, JSON.stringify(sup.slice(0, 60))); } catch { } }
  });
}
function openTxModal({ tx = null, types, title, preset = {}, onSaved } = {}) {
  const m = modal(title || (tx ? T("تعديل حركة") : T("حركة جديدة")), txFormHTML({ types: tx ? [tx.type] : types, cancel: true }));
  const form = $('form', m.el);
  for (const [k, v] of Object.entries(preset)) if (form[k]) form[k].value = v;
  bindTxForm(form, { tx, onSaved: () => { m.close(); onSaved && onSaved(); } });
  return m;
}
async function deleteTx(t, after) {
  if (!await confirmBox(T("حذف حركة"), `<p>${T("حذف")} ${esc(S.me.txTypes[t.type])} ${T("بمبلغ")} <b>${money(t.amount)}</b>${T("؟")}<br><span class="muted small">${T("تبقى الحركة محفوظة في سجل المحذوفات")}.</span></p>`, T("حذف"), true)) return;
  try { await bapi('/transactions/' + t.id, { method: 'DELETE' }); toast(T("تم الحذف"), 'ok'); after && after(); } catch (e) { fail(e); }
}
const payTag = (t) => !t.card_part ? '' : t.card_part >= t.amount ? ` <span class="badge muted">${icon('card')}${T("شبكة")}</span>` : ` <span class="badge muted">${T("كاش")} ${money(r2(t.amount - t.card_part))} + ${T("شبكة")} ${money(t.card_part)}</span>`;
const txDesc = (t) => [t.category_name && T(t.category_name), t.supplier, t.app_name && T(t.app_name), t.creditor_name, t.description].filter(Boolean).map(esc).join(' · ') + payTag(t);
const signedAmount = (t) => {
  const neg = ['purchase', 'expense', 'debt_payment', 'withdrawal', 'debt_writeoff'].includes(t.type);
  const v = t.type === 'adjustment' ? t.amount : neg ? -t.amount : t.amount;
  return `<span class="num ${v < 0 ? 'neg-t' : 'pos-t'}">${money(v)}</span>`;
};

/* ═════════════════════════ home ═════════════════════════ */
const kpi = (l, v, cls = '', sub = '', ic = 'coins') => `<div class="kpi ${cls}"><div class="k-ic">${icon(ic)}</div><div class="k-b"><div class="l">${l}</div><div class="v">${M(v)}</div>${sub ? `<div class="small muted">${sub}</div>` : ''}</div></div>`;
VIEWS.home = async (el) => {
  const d = await bapi('/summary');
  const t = d.today, mo = d.month;
  const max = Math.max(1, ...d.last7.map(x => Math.max(x.sales, x.out)));
  el.innerHTML = `
  ${pageHead('home', esc(T(S.meta.business.name)), fmtDate(wd()), `<a class="btn primary" href="#/shift">${icon('receipt')}${T("المشتريات والإقفال")}</a>`)}
  ${d.openShift ? `<div class="banner info">${icon('clock')}<span class="grow">${T("يوم العمل الحالي لم يُقفل بعد")} — <span class="small">${T("مبيعاته تُحتسب عند الإقفال")}</span></span></div>` : ''}
  ${(d.stale_open || []).map(s => `<div class="banner warn">${icon('alert')}<span class="grow">${T("يوم")} <b>${fmtDate(s.date)}</b> ${T("لم يُقفل — الكاشير انتقل لليوم الحالي. أدخل أرقام إقفاله من «أيام سابقة»")}</span>${can('past_days') ? `<a class="btn sm" href="#/shift" onclick="vCashier.day='${s.date}'">${T("إقفاله الآن")}</a>` : ''}</div>`).join('')}
  ${d.pending_cash ? `<div class="banner warn">${icon('cash')}<span class="grow">${T("يوجد")} <b>${d.pending_cash}</b> ${T("إقفال بانتظار استلام النقد من الكاشير")}</span><a class="btn sm" href="#/shifts">${T("استلام الآن")}</a></div>` : ''}
  <div class="grid kpis">
    ${kpi(T("رصيد الشركة الآن"), d.balance, 'accent', '', 'wallet')}
    ${kpi(T("منها آجل لدى التطبيقات"), d.receivables.total, '', '', 'truck')}
    ${kpi(T("إجمالي الديون"), d.debts.total, 'warn', '', 'landmark')}
    ${kpi(T("صافي المركز"), d.net_position, d.net_position < 0 ? 'neg' : 'pos', T("الرصيد − الديون"), 'scale')}
  </div>
  <div class="grid two" style="margin-bottom:16px">
    <section class="card"><h3>${icon('calendar')}${T("اليوم")}</h3>${movementTable(t)}</section>
    <section class="card"><h3>${icon('chart')}${T("هذا الشهر")}</h3>${movementTable(mo, true)}</section>
  </div>
  <section class="card"><h3>${icon('trendUp')}${T("آخر 7 أيام")}</h3>
    <div class="bars">${d.last7.map(x => `<div class="day" title="${T("مبيعات")} ${money(x.sales)} — ${T("مشتريات ومصروفات")} ${money(x.out)}"><div class="pair"><div class="b s" style="height:${x.sales / max * 100}%"></div><div class="b o" style="height:${x.out / max * 100}%"></div></div><div class="lbl">${dayName(x.date)}</div></div>`).join('')}</div>
    <div class="legend"><span><i style="background:var(--brand)"></i>${T("المبيعات")}</span><span><i style="background:var(--chart-out)"></i>${T("المشتريات والمصروفات")}</span></div>
  </section>`;
};
function movementTable(m, month = false) {
  const rows = [
    [T("نقدي"), m.sales.cash], [T("بطاقة / شبكة"), m.sales.card], [T("تطبيقات التوصيل (آجل)"), m.sales.apps],
    [("<b>" + T("إجمالي المبيعات") + "</b>"), m.sales.total, 'b'],
    [T("المشتريات"), m.purchases_paid + m.purchases_credit], [T("المصروفات"), m.expenses_paid + m.expenses_credit],
  ];
  if (month) rows.push([("<b>" + T("النتيجة التشغيلية") + "</b>"), m.operating_result, 'b']);
  return `<table><tbody>${rows.map(r => `<tr><td>${r[0]}</td><td class="n" style="text-align:end">${r[2] ? `<b>${M(r[1])}</b>` : M(r[1])}</td></tr>`).join('')}
    <tr><td>${T("عدد الطلبات / متوسط الطلب")}</td><td class="n" style="text-align:end">${m.sales.orders} / ${money(m.sales.avg)}</td></tr>
    <tr><td>${T("صافي النقد")} <span class="muted small">(${T("الكاش − المدفوع كاش")})</span></td><td class="n" style="text-align:end"><b>${M(m.cash_net)}</b></td></tr>
    ${S.meta.business.cash_count ? `<tr><td>${T("فروقات الجرد")}</td><td style="text-align:end">${m.shifts ? diffBadge(m.cash_diff) : ("<span class=\"muted small\">" + T("لا توجد شفتات مقفلة") + "</span>")}</td></tr>` : ''}
  </tbody></table>`;
}

/* ═════════════════════════ shift ═════════════════════════ */
/* ───── simple cashier page: record invoices + close the day, nothing else ───── */
const BUY_MODES = [['total', T("مجموع واحد"), T("اكتب مجموع كل الفواتير مرة واحدة")], ['multi', T("عدة فواتير"), T("اكتب مبلغ كل فاتورة والنظام يجمعها")], ['items', T("بالتفصيل"), T("اكتب الأصناف والكميات والأسعار")]];
const lsGet = (k, d) => { try { return localStorage.getItem(k) || d; } catch { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch { } };

async function vCashier(el) {
  // past days: a user with that permission picks an earlier work day and records its purchases / sales
  const canPast = can('past_days');
  const day = canPast && vCashier.day && vCashier.day < wd() ? vCashier.day : null;
  const d = day ? await bapi('/shifts/day?date=' + day) : await bapi('/shifts/current');
  const done = day && d.shift && d.shift.closed_at; // that past day already has its closing figures
  const sh = d.shift, txs = sh ? sh.transactions.slice().reverse() : [];
  const canBuy = can('purchases_add'), canClose = can('shift_manage');
  let tab = vCashier.tab && ((vCashier.tab === 'buy' && canBuy) || (vCashier.tab === 'close' && canClose)) ? vCashier.tab : (canBuy ? 'buy' : 'close');
  const mode = lsGet('buyMode', 'total');
  const reload = (t) => { vCashier.tab = t; vCashier(el); };
  const val = (k) => done ? d.shift[k] : '';
  const appVal = (id) => { const a = done && d.shift.apps.find(x => x.app_id === id); return a && a.amount ? a.amount : ''; };
  const counting = !!S.meta.business.cash_count, counts = counting && !!S.meta.business.cashier_counts;
  const float = sh ? sh.opening_float : (d.cash_float || 0);
  const apps = S.meta.apps.filter(a => a.active);
  const out = sh ? sh.drawer_out : 0;
  el.innerHTML = `<div class="cashier">
    <div class="c-head">${logoImg(S.meta.business, 'c-logo')}<div class="c-name">${esc(T(S.meta.business.name))}</div>${S.meta.business.open_time ? `<div class="small muted" style="margin-bottom:6px;display:inline-flex;align-items:center;gap:5px">${icon('clock')}${T("الدوام")}${timeLabel(S.meta.business.open_time)} – ${timeLabel(S.meta.business.close_time)}</div>` : ''}${canPast ? `<label class="c-date c-day">${icon('calendar')}${T("يوم العمل")} <input type="date" id="cDay" max="${wd()}" value="${day || wd()}"></label>` : `<span class="c-date">${icon('calendar')}${T("يوم العمل")} <b>${fmtDate(sh?.date || d.work_date)}</b></span>`}</div>
    ${day ? `<div class="banner warn">${icon('history')}<span class="grow">${T("أنت تُدخل بيانات يوم سابق:")} <b>${fmtDate(day)}</b>${done ? ` — ${T("هذا اليوم مُقفل، ويمكنك تعديل أرقامه وإضافة مشتريات له")}` : ''}</span><button type="button" class="btn sm" id="cToday">${T("العودة لليوم الحالي")}</button></div>` : ''}
    <div class="c-tabs">
      ${canBuy ? `<button data-tab="buy" class="${tab === 'buy' ? 'on' : ''}"><span class="t-ic">${icon('cart')}</span>${T("المشتريات")}</button>` : ''}
      ${canClose ? `<button data-tab="close" class="${tab === 'close' ? 'on' : ''}"><span class="t-ic">${icon('lock')}</span>${T("إقفال اليوم")}</button>` : ''}
    </div>
    ${tab === 'buy' ? `
    <section class="card">
      <div class="seg full-seg">${BUY_MODES.map(([k, l]) => `<label><input type="radio" name="bm" value="${k}" ${k === mode ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>
      <p class="muted small" style="margin:-6px 0 12px">${BUY_MODES.find(m => m[0] === mode)[2]}</p>
      <form id="fBuy" autocomplete="off">${buyFormHTML(mode)}</form>
    </section>
    <section class="card"><div class="card-head"><h3>${icon('receipt')}${day ? T("مشتريات هذا اليوم") : T("مشتريات اليوم")}</h3><span class="badge muted">${txs.length}</span><b>${M(out)}</b></div>
      ${txs.length ? txs.map(t => `<div class="c-item"><div class="ci-ic">${icon(t.items && t.items.length ? 'package' : 'receipt')}</div><div style="flex:1;min-width:0"><b>${M(t.amount)}</b>
        <div class="small muted">${esc(t.supplier || t.description || T("بدون اسم"))}${t.invoice_no ? (" · " + T("فاتورة") + " ") + esc(t.invoice_no) : ''} · ${timeOf(t.created_at)}${payTag(t)}</div>${itemsHTML(t.items)}</div>
        ${t.created_by === S.me.user.id ? `<button class="icon-btn danger" data-del="${t.id}" title="${T("حذف")}">${icon('trash')}</button>` : ''}</div>`).join('') : ("<p class=\"muted center\">" + T("لم تُسجّل مشتريات اليوم بعد") + "</p>")}
    </section>` : `
    <section class="card"><form id="fCl" autocomplete="off">
      <h3>${icon('trendUp')}${T("مبيعات اليوم")}</h3>
      <label class="big"><span class="lbl-ic">${icon('cash')}${T("كاش")}</span><input name="cash_sales" type="number" step="0.01" min="0" inputmode="decimal" required value="${val('cash_sales')}"></label>
      <label class="big"><span class="lbl-ic">${icon('card')}${T("شبكة")}</span><input name="card_sales" type="number" step="0.01" min="0" inputmode="decimal" required value="${val('card_sales')}"></label>
      <div class="sec-title">${icon('truck')}<span class="grow">${T("تطبيقات التوصيل")}</span>${can('settings_manage') ? `<a class="btn sm ghost" href="#/settings/apps">${icon('sliders')}${T("إضافة / تعديل / إخفاء")}</a>` : ''}</div>
      ${apps.map(a => `<label>${esc(T(a.name))}<input data-app="${a.id}" type="number" step="0.01" min="0" inputmode="decimal" placeholder="0" value="${appVal(a.id)}"></label>`).join('') || ("<p class=\"muted small\">" + T("لا توجد تطبيقات ظاهرة") + "</p>")}
      <label><span>${T("عدد الطلبات")} <span class="opt">${T("(اختياري)")}</span></span><input name="orders_count" type="number" min="0" step="1" inputmode="numeric" value="${done && d.shift.orders_count ? d.shift.orders_count : ''}"></label>
      ${day && counting ? `<label><span>${T("النقد المستلم فعلياً")} <span class="opt">${T("(اختياري)")}</span></span><input name="counted_cash" type="number" step="0.01" min="0" inputmode="decimal" value="${done && d.shift.counted_at ? d.shift.counted_cash : ''}"></label>` : counts ? `<label class="big">${T("النقد الموجود في الدرج")}<input name="counted_cash" type="number" step="0.01" min="0" inputmode="decimal" required></label>` : ''}
      <label><span>${T("ملاحظات")} <span class="opt">${T("(اختياري)")}</span></span><input name="notes" value="${esc(done ? d.shift.notes || '' : '')}"></label>
      <div class="io" id="io"></div>
      <button class="btn primary block">${icon('lock')}${done ? T("حفظ تعديل الإقفال") : T("إقفال اليوم")}</button>
    </form></section>
    ${!day && d.last_closed ? `<p class="muted small center">${T("آخر إقفال:")} ${fmtDate(d.last_closed.date)} — ${esc(d.last_closed.closed_by_name || '')} ${T("الساعة")} ${timeOf(d.last_closed.closed_at)}</p>` : ''}`}
  </div>`;
  $$('[data-tab]', el).forEach(b => b.onclick = () => reload(b.dataset.tab));
  const di = $('#cDay');
  if (di) di.onchange = () => { if (di.value && di.value > wd()) { di.value = day || wd(); return toast(T("لا يمكن اختيار يوم بعد يوم العمل الحالي"), 'err'); } vCashier.day = di.value && di.value < wd() ? di.value : null; reload(tab); };
  const bt = $('#cToday'); if (bt) bt.onclick = () => { vCashier.day = null; reload(tab); };
  $$('[name=bm]', el).forEach(r => r.onchange = () => { lsSet('buyMode', r.value); reload('buy'); });
  $$('[data-del]', el).forEach(b => b.onclick = () => deleteTx(txs.find(t => t.id == b.dataset.del), () => reload('buy')));

  const fb = $('#fBuy');
  if (fb) bindBuyForm(fb, mode, async () => { await loadMeta(); reload('buy'); }, day);

  const fc = $('#fCl');
  if (!fc) return;
  // in − out calculation shown live while typing the closing figures
  const showCash = !counts || can('shift_view_expected');
  const read = () => {
    const appRows = $$('[data-app]', fc).map(i => ({ app_id: Number(i.dataset.app), amount: r2(i.value), name: S.meta.apps.find(a => a.id == i.dataset.app).name }));
    const cash = r2(fc.cash_sales.value), card = r2(fc.card_sales.value), appsT = r2(appRows.reduce((t, a) => t + a.amount, 0));
    return { appRows, cash, card, appsT, total: r2(cash + card + appsT) };
  };
  const draw = () => {
    const x = read();
    $('#io').innerHTML = `
      <div class="io-sec in"><div class="io-h">${icon('arrowDown')}${T("الداخل (المبيعات)")}</div>
        <div class="r"><span>${T("كاش")}</span>${M(x.cash)}</div><div class="r"><span>${T("شبكة")}</span>${M(x.card)}</div><div class="r"><span>${T("تطبيقات (آجل)")}</span>${M(x.appsT)}</div>
        <div class="r t"><span>${T("إجمالي الداخل")}</span>${M(x.total)}</div></div>
      <div class="io-sec outs"><div class="io-h">${icon('arrowUp')}${T("الخارج (المشتريات)")}</div>
        <div class="r"><span>${txs.length} ${txs.length === 1 ? T("فاتورة") : T("فواتير")} ${T("من الدرج")}</span>${M(out)}</div></div>
      <div class="io-sec net"><div class="r t"><span>${T("الصافي")} = ${T("الداخل − الخارج")}</span><b class="${x.total - out < 0 ? 'neg-t' : ''}">${M(r2(x.total - out))}</b></div>
        ${showCash ? `<div class="r"><span class="lbl-ic">${icon('cash')}${T("الكاش بعد المشتريات (المطلوب تسليمه)")}</span><b class="${x.cash - out < 0 ? 'neg-t' : ''}">${M(r2(x.cash - out))}</b></div>` : ''}
        ${showCash && !counting ? `<div class="r"><span>+ ${T("العهدة الثابتة")}</span>${M(float)}</div><div class="r t"><span class="lbl-ic">${icon('wallet')}${T("إجمالي النقد في الدرج")}</span><b>${M(r2(float + x.cash - out))}</b></div>` : ''}</div>`;
  };
  fc.addEventListener('input', draw); draw();
  fc.onsubmit = async (e) => {
    e.preventDefault();
    const x = read();
    const ok = await confirmBox(T("تأكيد إقفال اليوم"), `<div class="summary-box">
      <div class="r"><span class="lbl-ic">${icon('cash')}${T("كاش")}</span>${M(x.cash)}</div><div class="r"><span class="lbl-ic">${icon('card')}${T("شبكة")}</span>${M(x.card)}</div>
      ${x.appRows.filter(a => a.amount).map(a => `<div class="r"><span class="lbl-ic">${icon('truck')}${esc(T(a.name))}</span>${M(a.amount)}</div>`).join('')}
      <div class="r t"><span>${T("إجمالي المبيعات")}</span>${M(x.total)}</div>
      <div class="r"><span>${T("المشتريات")}</span>${M(out)}</div>
      ${showCash ? `<div class="r t"><span>${T("الكاش بعد المشتريات")}</span>${M(r2(x.cash - out))}</div>` : ''}
      ${showCash && !counting ? `<div class="r"><span>${T("إجمالي النقد في الدرج (مع العهدة)")}</span>${M(r2(float + x.cash - out))}</div>` : ''}
      ${counts ? `<div class="r"><span>${T("النقد في الدرج")}</span>${M(fc.counted_cash.value)}</div>` : ''}</div>
      <p class="muted small">${day ? T("يوم العمل") + ' ' + fmtDate(day) : T("تأكد من الأرقام — لا يمكنك تعديلها بعد الإقفال") + '.'}</p>`, done ? T("نعم، احفظ") : T("نعم، أقفل اليوم"));
    if (!ok) return;
    busy($('button.primary', fc), async () => {
      const body = { ...formObj(fc), apps: x.appRows.map(({ app_id, amount }) => ({ app_id, amount })) };
      if (day) await bapi('/shifts/close-day', { method: 'POST', body: { ...body, date: day } });
      else await bapi('/shifts/close-current', { method: 'POST', body });
      await loadMeta();
      modal(T("تم الإقفال"), `<div class="result"><div class="res-ic">${icon('check')}</div><p>${T("تم إقفال اليوم وتسجيل المبيعات بنجاح")}.</p>
        <div class="summary-box" style="text-align:start"><div class="r"><span>${T("الداخل")}</span>${M(x.total)}</div><div class="r"><span>${T("الخارج")}</span>${M(out)}</div><div class="r t"><span>${T("الصافي")}</span>${M(r2(x.total - out))}</div></div></div>
        <div class="mf"><button class="btn primary block" data-x>${T("تم")}</button></div>`);
      reload(canBuy ? 'buy' : 'close');
    });
  };
}

// how a purchase was paid: cash from the drawer, by card (شبكة), or part of each
const payHTML = (split = true) => `<div class="pay-box"><div class="small muted" style="margin-bottom:4px">${T("طريقة الدفع")}</div>
  <div class="seg full-seg">${[['cash', T("كاش من الدرج")], ['card', T("شبكة")], ...(split ? [['split', T("كاش + شبكة")]] : [])].map(([k, l], i) => `<label><input type="radio" name="pay" value="${k}" ${i ? '' : 'checked'}><span>${l}</span></label>`).join('')}</div>
  <label class="pay-card" style="display:none;margin-top:8px"><span>${T("المدفوع شبكة")}</span><input name="card_part" type="number" step="0.01" min="0" inputmode="decimal"></label>
  <p class="muted small pay-note" style="margin:6px 0 0"></p></div>`;
function bindPay(f, total) {
  const box = $('.pay-box', f); if (!box) return () => 0;
  const pay = () => ($('[name=pay]:checked', box) || {}).value || 'cash';
  const draw = () => {
    const p = pay(), a = r2(total()), c = r2($('[name=card_part]', box).value);
    $('.pay-card', box).style.display = p === 'split' ? '' : 'none';
    $('[name=card_part]', box).required = p === 'split';
    $('.pay-note', box).textContent = p === 'card' ? T("لا تُخصم من نقد الدرج") : p === 'split' && a ? `${T("يُخصم من الدرج كاش")}: ${money(Math.max(0, r2(a - c)))}` : '';
  };
  f.addEventListener('input', draw); f.addEventListener('change', draw); draw();
  return () => { // the card part to send, or throws a message
    const p = pay(), a = r2(total());
    if (p === 'card') return a;
    if (p !== 'split') return 0;
    const c = r2($('[name=card_part]', box).value);
    if (!(c > 0) || c > a) throw new Error(T("المدفوع شبكة يجب أن يكون أكبر من صفر ولا يزيد عن قيمة الفاتورة"));
    return c;
  };
}
function buyFormHTML(mode) {
  const sup = `<label><span>${T("اسم المحل / المورد")} <span class="opt">${T("(اختياري)")}</span></span><input name="supplier" list="dl-sup"></label>`;
  if (mode === 'multi') return `
    <div class="mrows" id="mRows"></div>
    <button type="button" class="btn sm soft" id="mAdd">${icon('plus')}${T("فاتورة أخرى")}</button>
    <div class="summary-box"><div class="r t" style="border:0;margin:0;padding:0"><span>${T("المجموع")} (<span id="mCnt">0</span> ${T("فواتير")})</span><b class="num" id="mTot">0.00</b></div></div>
    ${payHTML(false)}
    <button class="btn primary block">${T("حفظ الفواتير")}</button>`;
  if (mode === 'items') return `
    <div class="fgrid">${sup}<label><span>${T("رقم الفاتورة")} <span class="opt">${T("(اختياري)")}</span></span><input name="invoice_no"></label></div>
    <div style="margin:14px 0">${itemsEditorHTML()}</div>
    ${payHTML()}
    <button class="btn primary block">${T("حفظ الفاتورة")}</button>`;
  return `
    <label class="big">${T("مجموع المشتريات")}<input name="amount" type="number" step="0.01" min="0.01" inputmode="decimal" required></label>
    <div class="fgrid"><label><span>${T("عدد الفواتير")} <span class="opt">${T("(اختياري)")}</span></span><input name="count" type="number" min="1" step="1" inputmode="numeric"></label>${sup}</div>
    <label><span>${T("ملاحظة")} <span class="opt">${T("(اختياري)")}</span></span><input name="description" placeholder="${T("مثال: خضار، غاز، أكياس…")}"></label>
    ${payHTML()}
    <button class="btn primary block">${T("حفظ")}</button>`;
}
function bindBuyForm(f, mode, done, day) {
  const base = { type: 'purchase', payment_method: 'drawer', ...(day ? { day } : {}) };
  if (mode === 'multi') {
    const box = $('#mRows', f);
    const calc = () => {
      const vals = $$('.mrow', box).map(r => r2($('[data-k=amount]', r).value)).filter(v => v > 0);
      $('#mTot', f).textContent = money(vals.reduce((a, b) => a + b, 0)); $('#mCnt', f).textContent = vals.length;
      $$('.mrow', box).forEach((r, i) => $('.mn', r).textContent = i + 1);
    };
    const add = () => {
      const r = document.createElement('div'); r.className = 'mrow';
      r.innerHTML = `<span class="mn"></span><input data-k="amount" type="number" step="0.01" min="0" inputmode="decimal" placeholder="${T("المبلغ")}"><input data-k="supplier" list="dl-sup" placeholder="${T("المحل (اختياري)")}"><button type="button" class="icon-btn danger" data-rm>${icon('x')}</button>`;
      box.append(r); calc(); return r;
    };
    box.addEventListener('input', calc);
    box.addEventListener('click', (e) => { if (e.target.closest('[data-rm]')) { e.target.closest('.mrow').remove(); if (!$('.mrow', box)) add(); calc(); } });
    box.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.dataset.k === 'amount') { e.preventDefault(); $('[data-k=amount]', add()).focus(); } });
    $('#mAdd', f).onclick = () => $('[data-k=amount]', add()).focus();
    add(); add(); add();
    supplierMemory({ addEventListener() { }, supplier: { value: '' } });
    bindPay(f, () => 0);
    f.onsubmit = (e) => {
      e.preventDefault();
      const card = ($('[name=pay]:checked', f) || {}).value === 'card';
      const entries = $$('.mrow', box).map(r => ({ ...base, amount: r2($('[data-k=amount]', r).value), supplier: $('[data-k=supplier]', r).value.trim() })).filter(x => x.amount > 0).map(x => ({ ...x, card_part: card ? x.amount : 0 }));
      if (!entries.length) return toast(T("اكتب مبلغ فاتورة واحدة على الأقل"), 'err');
      busy(e.submitter, async () => {
        const r = await bapi('/transactions/batch', { method: 'POST', body: { entries } });
        toast(`${T("تم حفظ")} ${r.ids.length} ${T("فواتير — المجموع")} ${money(r.total)} ✓`, 'ok'); done();
      });
    };
    setTimeout(() => $('[data-k=amount]', box).focus(), 50);
    return;
  }
  supplierMemory(f);
  if (mode === 'items') {
    const ed = bindItems(f, []);
    const cardPart = bindPay(f, () => ed.total());
    f.onsubmit = (e) => {
      e.preventDefault();
      const items = ed.read();
      if (!items.length || !(ed.total() > 0)) return toast(T("أضف صنفاً واحداً على الأقل بسعره"), 'err');
      let card_part; try { card_part = cardPart(); } catch (er) { return toast(er.message, 'err'); }
      busy(e.submitter, async () => {
        const { pay, ...fo } = formObj(f);
        await bapi('/transactions', { method: 'POST', body: { ...base, ...fo, items, card_part } });
        toast(`${T("تم حفظ الفاتورة")} — ${money(ed.total())} ✓`, 'ok'); done();
      });
    };
    setTimeout(() => $('[data-k=name]', f).focus(), 50);
    return;
  }
  const cardPart = bindPay(f, () => f.amount.value);
  f.onsubmit = (e) => {
    e.preventDefault();
    const { count, pay, ...rest } = formObj(f);
    const n = parseInt(count);
    const description = [n > 1 ? `${T("مجموع")} ${n} ${T("فواتير")}` : '', rest.description].filter(Boolean).join(' — ');
    let card_part; try { card_part = cardPart(); } catch (er) { return toast(er.message, 'err'); }
    busy(e.submitter, async () => {
      await bapi('/transactions', { method: 'POST', body: { ...base, ...rest, description, card_part } });
      toast((T("تم الحفظ") + " ✓"), 'ok'); done();
    });
  };
  setTimeout(() => f.amount.focus(), 50);
}

// one simple page for everyone: purchases + close the day (no shift opening)
VIEWS.shift = (el) => vCashier(el);

/* ═════════════════════════ transactions list ═════════════════════════ */
VIEWS.tx = async (el) => {
  const st = VIEWS.tx.st || (VIEWS.tx.st = { from: wd().slice(0, 8) + '01', to: wd(), type: '', method: '', q: '', deleted: '' });
  el.innerHTML = `
  ${pageHead('list', T("الحركات المالية"), '', `<button class="btn" id="bCsv">${icon('download')}${T("تصدير")} Excel</button>${can('purchases_add') || can('finance_manage') ? `<button class="btn primary" id="bNew">${icon('plus')}${T("حركة جديدة")}</button>` : ''}`)}
  <section class="card"><form id="fFilt" class="fgrid">
    <label>${T("من")}<input type="date" name="from" value="${st.from}"></label><label>${T("إلى")}<input type="date" name="to" value="${st.to}"></label>
    <label>${T("النوع")}<select name="type"><option value="">${T("الكل")}</option>${opt(Object.entries(S.me.txTypes), st.type, ([k, v]) => [k, v])}</select></label>
    <label>${T("طريقة الدفع")}<select name="method"><option value="">${T("الكل")}</option>${opt(Object.entries(S.me.methods), st.method, ([k, v]) => [k, v])}</select></label>
    <label>${T("بحث")}<input name="q" value="${esc(st.q)}" placeholder="${T("مورد، فاتورة، ملاحظة")}"></label>
    <label class="check" style="align-self:end"><input type="checkbox" name="deleted" value="1" ${st.deleted ? 'checked' : ''}> ${T("المحذوفات")}</label>
  </form></section>
  <section class="card" id="txList"><div class="empty">${T("جاري التحميل…")}</div></section>`;
  const load = async () => {
    Object.assign(st, { ...formObj($('#fFilt')), deleted: $('#fFilt').deleted.checked ? '1' : '' });
    const rows = await bapi('/transactions?' + new URLSearchParams(st));
    VIEWS.tx.rows = rows;
    const sumBy = {};
    rows.forEach(t => { sumBy[t.type] = (sumBy[t.type] || 0) + t.amount; });
    $('#txList').innerHTML = rows.length ? `<div class="row small" style="margin-bottom:12px">${Object.entries(sumBy).map(([k, v]) => `<span class="badge muted">${S.me.txTypes[k]}: ${money(v)}</span>`).join('')}<span class="muted">${rows.length} ${T("حركة")}</span></div>
      <div class="tbl-wrap"><table><thead><tr><th>${T("التاريخ")}</th><th>${T("النوع")}</th><th>${T("البيان")}</th><th>${T("الفاتورة")}</th><th>${T("الدفع")}</th><th>${T("المبلغ")}</th><th>${T("بواسطة")}</th><th></th></tr></thead><tbody>
      ${rows.map(t => `<tr class="${t.deleted_at ? 'deleted' : ''}"><td class="small" style="white-space:nowrap">${dayName(t.date)}<br>${t.date}</td><td>${esc(S.me.txTypes[t.type])}</td><td>${txDesc(t)}</td><td class="small">${esc(t.invoice_no || '')}</td>
        <td class="small">${esc(S.me.methods[t.payment_method])}</td><td>${signedAmount(t)}${t.fee ? `<div class="small muted">${T("عمولة")} ${money(t.fee)}</div>` : ''}</td>
        <td class="small muted">${esc(t.created_by_name || '')}${t.deleted_at ? `<br>${T("حذفها")} ${esc(t.deleted_by_name)}` : ''}</td>
        <td style="white-space:nowrap">${!t.deleted_at && can('tx_edit') ? `<button class="icon-btn" data-ed="${t.id}">${icon('edit')}</button><button class="icon-btn danger" data-del="${t.id}">${icon('trash')}</button>` : ''}</td></tr>`).join('')}
      </tbody></table></div>` : ("<div class=\"empty\">" + T("لا توجد حركات في هذه الفترة") + "</div>");
    $$('[data-del]', el).forEach(b => b.onclick = () => deleteTx(rows.find(t => t.id == b.dataset.del), load));
    $$('[data-ed]', el).forEach(b => b.onclick = () => openTxModal({ tx: rows.find(t => t.id == b.dataset.ed), onSaved: load }));
  };
  $('#fFilt').onchange = () => load().catch(fail);
  $('#fFilt').oninput = (e) => { if (e.target.name === 'q') { clearTimeout(VIEWS.tx.tm); VIEWS.tx.tm = setTimeout(() => load().catch(fail), 350); } };
  $('#fFilt').onsubmit = (e) => e.preventDefault();
  if ($('#bNew')) $('#bNew').onclick = () => openTxModal({ onSaved: load });
  $('#bCsv').onclick = () => downloadCSV(`${T("حركات")}_${st.from}_${st.to}.csv`, [[T("التاريخ"), T("النوع"), T("التصنيف"), T("المورد"), T("الدائن"), T("التطبيق"), T("رقم الفاتورة"), T("طريقة الدفع"), T("المبلغ"), T("العمولة"), T("ملاحظة"), T("بواسطة")],
    ...(VIEWS.tx.rows || []).map(t => [t.date, S.me.txTypes[t.type], t.category_name, t.supplier, t.creditor_name, t.app_name, t.invoice_no, S.me.methods[t.payment_method], t.amount, t.fee, t.description, t.created_by_name])]);
  await load();
};

/* ═════════════════════════ expenses ═════════════════════════ */
// rent, salaries, electricity… : list, totals by category, quick add
VIEWS.expenses = async (el) => {
  const st = VIEWS.expenses.st || (VIEWS.expenses.st = { from: wd().slice(0, 8) + '01', to: wd(), category_id: '' });
  const canAdd = can('finance_manage') || can('purchases_add');
  const cats = S.meta.categories.filter(c => c.kind === 'expense');
  el.innerHTML = `${pageHead('fileText', T("المصروفات"), T("الرواتب والإيجار والكهرباء وغيرها"), `${canAdd ? `<button class="btn primary" id="bNewExp">${icon('plus')}${T("مصروف جديد")}</button>` : ''}`)}
    <section class="card"><form id="fE" class="fgrid">
      <label>${T("من")}<input type="date" name="from" value="${st.from}"></label><label>${T("إلى")}<input type="date" name="to" value="${st.to}"></label>
      <label>${T("التصنيف")}<select name="category_id"><option value="">${T("الكل")}</option>${opt(cats, st.category_id)}</select></label>
    </form></section>
    <div id="expBody"><div class="empty">${T("جاري التحميل…")}</div></div>`;
  const load = async () => {
    Object.assign(st, formObj($('#fE')));
    const rows = await bapi('/transactions?' + new URLSearchParams({ ...st, type: 'expense' }));
    const total = r2(rows.reduce((t, x) => t + x.amount, 0));
    const onCredit = r2(rows.filter(x => x.payment_method === 'credit').reduce((t, x) => t + x.amount, 0));
    const by = {};
    rows.forEach(x => { const k = x.category_name || T("بدون تصنيف"); by[k] = (by[k] || 0) + x.amount; });
    const list = Object.entries(by).sort((a, b) => b[1] - a[1]), mx = Math.max(1, ...list.map(x => x[1]));
    $('#expBody').innerHTML = `
      <div class="grid kpis">${kpi(T("إجمالي المصروفات"), total, 'accent', `${rows.length} ${T("حركة")}`, 'fileText')}
        ${kpi(T("مدفوعة"), r2(total - onCredit), '', '', 'wallet')}${kpi(T("على الدين"), onCredit, onCredit ? 'warn' : '', '', 'landmark')}</div>
      <div class="grid two" style="margin-bottom:16px">
        <section class="card"><h3>${icon('chart')}${T("حسب التصنيف")}</h3>${list.length ? `<table><tbody>${list.map(([n, v]) => `<tr><td>${esc(T(n))}</td><td style="width:40%"><div class="hbar"><i style="width:${v / mx * 100}%"></i></div></td><td class="n">${money(v)}</td><td class="small muted">${total ? Math.round(v / total * 100) : 0}%</td></tr>`).join('')}</tbody></table>` : `<p class="muted">${T("لا يوجد")}</p>`}</section>
        <section class="card"><h3>${icon('info')}${T("ملاحظة")}</h3><p class="muted" style="margin:0">${T("المصروف المدفوع من الدرج يدخل في جرد اليوم، ومن حساب الشركة يُخصم من الرصيد، وعلى الدين يُضاف لحساب الدائن. التصنيفات تُعدّل من «إعدادات النشاط»")}.</p></section>
      </div>
      <section class="card">${rows.length ? `<div class="tbl-wrap"><table><thead><tr><th>${T("التاريخ")}</th><th>${T("التصنيف")}</th><th>${T("البيان")}</th><th>${T("الدفع")}</th><th>${T("المبلغ")}</th><th></th></tr></thead><tbody>
        ${rows.map(t => `<tr><td class="small" style="white-space:nowrap">${dayName(t.date)}<br>${t.date}</td><td>${t.category_name ? `<span class="badge muted">${esc(T(t.category_name))}</span>` : ''}</td><td class="small">${esc([t.supplier, t.creditor_name, t.description].filter(Boolean).join(' · '))}${itemsHTML(t.items)}</td>
          <td class="small muted">${esc(S.me.methods[t.payment_method])}</td><td class="n"><b>${money(t.amount)}</b></td>
          <td class="row-acts">${can('tx_edit') ? `<button class="icon-btn" data-ed="${t.id}" title="${T("تعديل")}">${icon('edit')}</button><button class="icon-btn danger" data-del="${t.id}" title="${T("حذف")}">${icon('trash')}</button>` : ''}</td></tr>`).join('')}
        </tbody></table></div>` : `<div class="empty">${T("لا توجد مصروفات في هذه الفترة")}</div>`}</section>`;
    $$('[data-del]', el).forEach(b => b.onclick = () => deleteTx(rows.find(t => t.id == b.dataset.del), load));
    $$('[data-ed]', el).forEach(b => b.onclick = () => openTxModal({ tx: rows.find(t => t.id == b.dataset.ed), onSaved: load }));
  };
  $('#fE').onchange = () => load().catch(fail);
  if ($('#bNewExp')) $('#bNewExp').onclick = () => openTxModal({ types: ['expense'], title: T("مصروف جديد"), onSaved: load });
  await load();
};

/* ═════════════════════════ shifts history ═════════════════════════ */
const countBadge = (s) => s.status === 'open' ? ("<span class=\"badge info\">" + T("لم يُقفل بعد") + "</span>")
  : s.counted_at ? diffBadge(s.difference) // an old count keeps its result
  : !S.meta.business.cash_count ? (s.expected_cash !== undefined ? `<span class="badge muted" title="${T("العهدة + الكاش − ما دُفع كاش من الدرج")}">${money(s.expected_cash)}</span>` : '—')
  : ("<span class=\"badge warn\">" + T("بانتظار استلام النقد") + "</span>");
const shiftTotal = (s) => r2(s.cash_sales + s.card_sales + s.app_sales);

VIEWS.shifts = async (el) => {
  const st = VIEWS.shifts.st || (VIEWS.shifts.st = { from: addDays(wd(), -30), to: wd() });
  el.innerHTML = `${pageHead('clipboard', T("سجل الإقفالات"), T("كل يوم مقفل: المبيعات والنقد ونتيجة الجرد"))}
  <section class="card"><form id="fF" class="row"><label>${T("من")}<input type="date" name="from" value="${st.from}"></label><label>${T("إلى")}<input type="date" name="to" value="${st.to}"></label></form></section>
  <section class="card" id="shList"></section>`;
  const load = async () => {
    Object.assign(st, formObj($('#fF')));
    const rows = await bapi('/shifts?' + new URLSearchParams(st));
    const pending = S.meta.business.cash_count ? rows.filter(s => s.status === 'closed' && !s.counted_at).length : 0;
    $('#shList').innerHTML = (pending ? `<div class="alert warn">${pending} ${T("إقفال بانتظار استلام النقد — اضغط عليه ثم «استلام النقد»")}.</div>` : '') +
      (rows.length ? `<div class="tbl-wrap"><table><thead><tr><th>${T("اليوم")}</th><th>${T("أقفله")}</th><th>${T("نقدي")}</th><th>${T("بطاقة")}</th><th>${T("تطبيقات")}</th><th>${T("الإجمالي")}</th><th>${S.meta.business.cash_count ? T("النقد") : T("إجمالي النقد")}</th></tr></thead><tbody>
      ${rows.map(s => `<tr class="click" data-id="${s.id}"><td style="white-space:nowrap">${fmtDate(s.date)}</td>
        <td class="small">${s.status === 'open' ? `<span class="muted">${esc(s.opened_by_name || '')}</span>` : `${esc(s.closed_by_name || '')}<br><span class="muted">${timeOf(s.closed_at)}</span>`}</td>
        <td class="n">${money(s.cash_sales)}</td><td class="n">${money(s.card_sales)}</td><td class="n">${money(s.app_sales)}</td><td class="n"><b>${money(shiftTotal(s))}</b></td>
        <td>${countBadge(s)}</td></tr>`).join('')}</tbody></table></div>` : ("<div class=\"empty\">" + T("لا توجد شفتات") + "</div>"));
    $$('tr[data-id]', el).forEach(r => r.onclick = () => shiftDetail(r.dataset.id, load));
  };
  $('#fF').onchange = () => load().catch(fail);
  await load();
};

async function shiftDetail(id, after) {
  const s = await bapi('/shifts/' + id).catch(fail);
  if (!s) return;
  const edit = s.status === 'closed' && can('shift_reopen');
  const txCat = (t) => ({ ...t, category_name: S.meta.categories.find(c => c.id === t.category_id)?.name });
  const m = modal(`${T("يوم")} ${fmtDate(s.date)}`, `
    <div class="summary-box">
      <div class="r"><span>${T("فتحه")}</span><span>${esc(s.opened_by_name)} — ${s.opened_at}</span></div>
      <div class="r"><span>${T("أقفله")}</span><span>${s.status === 'closed' ? `${esc(s.closed_by_name)} — ${s.closed_at}` : ("<span class=\"badge info\">" + T("مفتوح") + "</span>")}</span></div>
    </div>
    ${s.status === 'closed' ? `<div class="grid two"><div><h4>${T("المبيعات")}</h4><div class="summary-box">
      <div class="r"><span>${T("نقدي")}</span>${M(s.cash_sales)}</div><div class="r"><span>${T("بطاقة")}</span>${M(s.card_sales)}</div>
      ${s.apps.filter(a => a.amount).map(a => `<div class="r"><span>${esc(T(a.name))}</span>${M(a.amount)}</div>`).join('')}
      <div class="r t"><span>${T("الإجمالي")}</span>${M(shiftTotal(s))}</div>
      <div class="r"><span>${T("عدد الطلبات")}</span><span>${s.orders_count}</span></div><div class="r"><span>${T("رسوم البطاقة")}</span>${M(s.card_fee)}</div></div></div>
      <div><h4>${T("النقد")}</h4><div class="summary-box">
      <div class="r"><span>${T("العهدة")}</span>${M(s.opening_float)}</div><div class="r"><span>+ ${T("كاش المبيعات")}</span>${M(s.cash_sales)}</div><div class="r"><span>− ${T("مدفوع كاش من الدرج")}</span>${M(s.drawer_out)}</div>
      ${s.expected_cash !== undefined ? `<div class="r t"><span>${S.meta.business.cash_count ? T("النقد المتوقع") : T("إجمالي النقد")}</span><b>${M(s.expected_cash)}</b></div>` : ''}
      ${s.counted_at ? `<div class="r"><span>${T("النقد المستلم / المعدود")}</span>${M(s.counted_cash)}</div><div class="r"><span>${T("عند الموظفين")}</span>${M(s.cash_with_staff)}</div>` : ''}
      ${S.meta.business.cash_count || s.counted_at ? `<div class="r t"><span>${T("النتيجة")}</span>${countBadge(s)}</div>` : ''}</div></div></div>
      ${s.notes ? `<p><b>${T("ملاحظات:")}</b> ${esc(s.notes)}</p>` : ''}` : ''}
    <h4>${T("الفواتير والحركات")} (${s.transactions.length})</h4>
    ${s.transactions.length ? `<div class="tbl-wrap"><table><tbody>${s.transactions.map(t => `<tr><td>${esc(S.me.txTypes[t.type])}</td><td>${txDesc(txCat(t))}<div class="small muted">${esc(t.created_by_name)} ${timeOf(t.created_at)}</div></td>
      <td class="n">${money(t.amount)}</td><td style="white-space:nowrap">${can('tx_edit') ? `<button class="icon-btn" data-ed="${t.id}" title="${T("تعديل")}">${icon('edit')}</button><button class="icon-btn danger" data-del="${t.id}" title="${T("حذف")}">${icon('trash')}</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : ("<p class=\"muted\">" + T("لا توجد") + "</p>")}
    ${edit ? `<div class="mf" style="flex-wrap:wrap">
      ${S.meta.business.cash_count ? `<button class="btn primary" id="bRecv">${icon('cash')}${s.counted_at ? T("تعديل النقد المستلم") : T("استلام النقد")}</button>` : ''}
      <button class="btn" id="bEdit">${icon('edit')}${T("تعديل أرقام الإقفال")}</button>
      <button class="btn" id="bReopen">${icon('undo')}${T("إلغاء الإقفال")}</button>
      <button class="btn danger" id="bDelSh">${icon('trash')}${T("حذف الإقفال")}</button></div>
      <p class="muted small">${T("كل تعديل يُسجّل في «سجل التعديلات» باسمك مع القيمة قبل وبعد")}.</p>` : ''}
    ${s.status === 'open' && can('shift_reopen') ? `<div class="mf" style="flex-wrap:wrap">
      <button class="btn primary" id="bCloseOld">${icon('lock')}${T("إقفال هذا اليوم")}</button>
      <button class="btn danger" id="bDelSh">${icon('trash')}${T("حذف هذا اليوم")}</button></div>` : ''}`, { wide: true });
  const refresh = () => { m.close(); after && after(); shiftDetail(id, after); };
  $$('[data-ed]', m.el).forEach(b => b.onclick = () => openTxModal({ tx: s.transactions.find(t => t.id == b.dataset.ed), onSaved: refresh }));
  $$('[data-del]', m.el).forEach(b => b.onclick = () => deleteTx(s.transactions.find(t => t.id == b.dataset.del), refresh));
  const del = $('#bDelSh', m.el); if (del) del.onclick = () => deleteShift(s, () => { m.close(); after && after(); });
  const co = $('#bCloseOld', m.el); if (co) co.onclick = () => closeOpenShift(s, () => { m.close(); after && after(); });
  if (!edit) return;
  if ($('#bRecv', m.el)) $('#bRecv', m.el).onclick = () => receiveCash(s, refresh);
  $('#bEdit', m.el).onclick = () => editShift(s, refresh);
  $('#bReopen', m.el).onclick = async () => {
    if (!await confirmBox(T("إلغاء الإقفال"), ("<p>" + T("سيُلغى الإقفال ويعود اليوم مفتوحاً حتى يُقفل مجدداً. للتصحيح البسيط استخدم «تعديل أرقام الإقفال» بدلاً من ذلك. متابعة؟") + "</p>"), T("إلغاء الإقفال"), true)) return;
    try { await bapi(`/shifts/${s.id}/reopen`, { method: 'POST' }); await loadMeta(); m.close(); toast(T("تم إلغاء الإقفال"), 'ok'); location.hash = '#/shift'; } catch (e) { fail(e); }
  };
}

// the owner / manager closes any day left open (e.g. the cashier forgot to close it), whatever its date
function closeOpenShift(s, after) {
  const apps = S.meta.apps.filter(a => a.active);
  const counting = !!S.meta.business.cash_count;
  const m = modal(`${T("إقفال يوم")} ${fmtDate(s.date)}`, `<form autocomplete="off">
    <div class="summary-box"><div class="r"><span>${T("فتحه")}</span><span>${esc(s.opened_by_name || '')} — ${s.opened_at}</span></div>
      <div class="r"><span>${T("الفواتير والحركات")}</span><b>${s.transactions.length}</b> · ${M(s.drawer_out)}</div></div>
    <div class="fgrid">
      <label>${T("نقدي")}<input name="cash_sales" type="number" step="0.01" inputmode="decimal" required></label>
      <label>${T("بطاقة / شبكة")}<input name="card_sales" type="number" step="0.01" min="0" inputmode="decimal" required></label>
      ${apps.map(a => `<label>${esc(T(a.name))}<input data-app="${a.id}" type="number" step="0.01" min="0" inputmode="decimal" placeholder="0"></label>`).join('')}
      <label>${T("عدد الطلبات")} <input name="orders_count" type="number" min="0" step="1" inputmode="numeric"></label>
      ${counting ? `<label>${T("النقد المستلم فعلياً")} <span class="opt">${T("(اختياري)")}</span><input name="counted_cash" type="number" step="0.01" inputmode="decimal"></label>` : ''}
      <label class="full">${T("ملاحظات")}<input name="notes"></label>
    </div>
    <div class="summary-box"><div class="r"><span>${T("العهدة")}</span>${M(s.opening_float)}</div><div class="r"><span>− ${T("مدفوع كاش من الدرج")}</span>${M(s.drawer_out)}</div>
      <div class="r t"><span>${T("إجمالي النقد")}</span><b id="coCash"></b></div></div>
    <p class="hint">${icon('info')}<span>${T("يُقفل هذا اليوم بتاريخه، ويُسجّل الإقفال باسمك في «سجل التعديلات»")}.</span></p>
    <div class="mf"><button class="btn primary">${icon('lock')}${T("إقفال هذا اليوم")}</button><button type="button" class="btn" data-x>${T("إلغاء")}</button></div></form>`, { wide: true });
  const f = $('form', m.el);
  const draw = () => { $('#coCash', m.el).innerHTML = M(r2(s.opening_float + r2(f.cash_sales.value) - s.drawer_out)); };
  f.oninput = draw; draw();
  f.onsubmit = (e) => { e.preventDefault(); busy(e.submitter, async () => {
    const body = { ...formObj(f), apps: $$('[data-app]', f).map(i => ({ app_id: Number(i.dataset.app), amount: r2(i.value) })) };
    await bapi(`/shifts/${s.id}/close`, { method: 'POST', body });
    m.close(); await loadMeta(); toast(`${T("تم إقفال يوم")} ${fmtDate(s.date)}`, 'ok'); after();
  }); };
}

// delete a wrong closing (e.g. a day recorded twice): its invoices move to another day or go with it
async function deleteShift(s, after) {
  const near = (await bapi('/shifts?' + new URLSearchParams({ from: addDays(s.date, -7), to: addDays(s.date, 7) }))).filter(x => x.id !== s.id);
  const n = s.transactions.length;
  const m = modal(`${T("حذف إقفال يوم")} ${fmtDate(s.date)}`, `<form>
    <div class="summary-box"><div class="r"><span>${T("المبيعات")}</span>${M(shiftTotal(s))}</div><div class="r"><span>${T("الفواتير والحركات")}</span><b>${n}</b> · ${M(s.drawer_out)}</div></div>
    ${n ? `<div class="sec-title">${T("ماذا نفعل بفواتير هذا اليوم؟")}</div>
      <label class="check"><input type="radio" name="what" value="move" ${near.length ? 'checked' : 'disabled'}> ${T("نقلها إلى إقفال يوم آخر")}</label>
      <select name="move_to" style="margin:6px 0 10px" ${near.length ? '' : 'disabled'}>${near.map(x => `<option value="${x.id}">${fmtDate(x.date)} — ${x.status === 'open' ? T("مفتوح") : money(shiftTotal(x))}</option>`).join('')}</select>
      <label class="check"><input type="radio" name="what" value="delete" ${near.length ? '' : 'checked'}> ${T("حذفها مع الإقفال")}</label>` : ''}
    <p class="hint">${icon('alert')}<span>${T("يُحذف الإقفال نهائياً ويُسجّل في «سجل التعديلات» بكل أرقامه، ويُعاد حساب الرصيد")}.</span></p>
    <div class="mf"><button class="btn danger">${icon('trash')}${T("حذف الإقفال")}</button><button type="button" class="btn" data-x>${T("إلغاء")}</button></div></form>`);
  const f = $('form', m.el);
  f.onsubmit = (e) => { e.preventDefault(); busy(e.submitter, async () => {
    const move = n && f.what && f.what.value === 'move' ? f.move_to.value : undefined;
    const r = await bapi('/shifts/' + s.id, { method: 'DELETE', body: { move_to: move } });
    m.close(); await loadMeta(); toast(r.moved_to ? `${T("تم الحذف ونُقلت الفواتير إلى يوم")} ${fmtDate(r.moved_to)}` : T("تم حذف الإقفال"), 'ok'); after();
  }); };
}
function receiveCash(s, after) {
  const m = modal(T("استلام النقد من الكاشير"), `<form>
    <div class="summary-box"><div class="r"><span>${T("كاش المبيعات")}</span>${M(s.cash_sales)}</div><div class="r"><span>− ${T("فواتير من الدرج")}</span>${M(s.drawer_out)}</div>
      <div class="r"><span>+ ${T("العهدة")}</span>${M(s.opening_float)}</div><div class="r t"><span>${T("النقد المتوقع")}</span>${M(s.expected_cash)}</div></div>
    <div class="fgrid"><label class="big">${T("المبلغ المستلم / المعدود")}<input name="counted_cash" type="number" step="0.01" inputmode="decimal" required value="${s.counted_at ? s.counted_cash : ''}"></label>
    <label>${T("نقد عند الموظفين")}<input name="cash_with_staff" type="number" step="0.01" inputmode="decimal" value="${s.counted_at ? s.cash_with_staff : 0}"></label></div>
    <p class="hint">${icon('info')}<span>${T("يمكن إدخال مبلغ بالسالب، مثلاً إذا كانت المشتريات أكبر من كاش المبيعات ودفع الكاشير الفرق من عنده")}.</span></p>
    <div class="summary-box"><div class="r"><span>${T("النتيجة")}</span><span id="rcvRes"></span></div></div>
    <div class="mf"><button class="btn primary">${T("حفظ")}</button><button type="button" class="btn" data-x>${T("إلغاء")}</button></div></form>`);
  const f = $('form', m.el);
  const draw = () => { $('#rcvRes', m.el).innerHTML = f.counted_cash.value === '' ? ("<span class=\"muted small\">" + T("أدخل المبلغ") + "</span>") : diffBadge(r2(r2(f.counted_cash.value) + r2(f.cash_with_staff.value) - s.expected_cash)); };
  f.oninput = draw; draw();
  f.onsubmit = (e) => { e.preventDefault(); busy(e.submitter, async () => { const r = await bapi(`/shifts/${s.id}/receive`, { method: 'POST', body: formObj(f) }); m.close(); toast(T("تم تسجيل الاستلام"), 'ok'); after(); }); };
}

function editShift(s, after) {
  const m = modal(T("تعديل أرقام الإقفال"), `<form>
    <div class="fgrid">
      <label>${T("يوم العمل")}<input type="date" name="date" value="${s.date}" required></label>
      <label>${T("نقدي")}<input name="cash_sales" type="number" step="0.01" required value="${s.cash_sales}"></label>
      <label>${T("بطاقة / شبكة")}<input name="card_sales" type="number" step="0.01" min="0" required value="${s.card_sales}"></label>
      ${s.apps.map(a => `<label>${esc(T(a.name))}<input data-app="${a.app_id}" type="number" step="0.01" min="0" value="${a.amount || ''}" placeholder="0"></label>`).join('')}
      <label>${T("عدد الطلبات")}<input name="orders_count" type="number" min="0" step="1" value="${s.orders_count}"></label>
      ${s.counted_at && !S.meta.business.cash_count ? `<label class="check full"><input type="checkbox" name="clear_count" value="1"> ${T("حذف نتيجة العدّ القديمة لهذا اليوم (العجز / الزيادة)")} — ${diffBadge(s.difference)}</label>` : ''}
      ${s.counted_at && S.meta.business.cash_count ? `<label>${T("النقد المستلم / المعدود")}<input name="counted_cash" type="number" step="0.01" value="${s.counted_cash}"></label>
      <label>${T("نقد عند الموظفين")}<input name="cash_with_staff" type="number" step="0.01" value="${s.cash_with_staff}"></label>` : ''}
      <label class="full">${T("ملاحظات")}<input name="notes" value="${esc(s.notes || '')}"></label>
    </div>
    <p class="hint">${T("سيُسجّل التعديل باسمك مع القيم قبل وبعد، ويُعاد حساب الرصيد ونتيجة الجرد تلقائياً")}.</p>
    <div class="mf"><button class="btn primary">${T("حفظ التعديل")}</button><button type="button" class="btn" data-x>${T("إلغاء")}</button></div></form>`, { wide: true });
  const f = $('form', m.el);
  f.onsubmit = (e) => {
    e.preventDefault();
    busy(e.submitter, async () => {
      await bapi('/shifts/' + s.id, { method: 'PUT', body: { ...formObj(f), apps: $$('[data-app]', f).map(i => ({ app_id: Number(i.dataset.app), amount: r2(i.value) })) } });
      m.close(); toast(T("تم حفظ التعديل"), 'ok'); after();
    });
  };
}

/* ═════════════════════════ edits log ═════════════════════════ */
const F_L = {
  member: T("العضو"), month: T("الشهر"), monthly: T("الاشتراك الشهري"), from_month: T("من شهر"), parent: T("الأب / الأم"), category: T("الفئة"), contributing: T("مساهم"),
  join_month: T("شهر الانضمام"), left_month: T("شهر الخروج"), guardian_access: T("متابعة الأب"), notes: T("ملاحظات"), installment: T("القسط"), start_month: T("بداية الأقساط"),
  anonymous: T("مجهول"), amount: T("المبلغ"), due_day: T("يوم الاستحقاق"), loan_multiplier: T("مضاعف حد القرض"), apply_from: T("يُطبّق من"), members: T("عدد الأعضاء"),
  issued_date: T("تاريخ الصرف"), over_limit: T("تجاوز الحد"), username: T("اسم الدخول"),
  type: T("النوع"), payment_method: T("طريقة الدفع"), amount: T("المبلغ"), fee: T("العمولة"), date: T("التاريخ"), category: T("التصنيف"), supplier: T("المورد"),
  invoice_no: T("رقم الفاتورة"), creditor: T("الدائن"), app: T("التطبيق"), description: T("الملاحظة"), cash_sales: T("الكاش"), card_sales: T("الشبكة"),
  orders_count: T("عدد الطلبات"), counted_cash: T("النقد المستلم"), cash_with_staff: T("نقد عند الموظفين"), difference: T("نتيجة الجرد"), notes: T("الملاحظات"),
  logo: T("الشعار"), card_fee_pct: T("رسوم البطاقة %"), cash_float: T("العهدة"), opening_balance: T("الرصيد الافتتاحي"), cashier_counts: T("الكاشير يعدّ الدرج"), day_start_hour: T("بداية يوم العمل (ساعة)"), open_time: T("وقت الافتتاح"), close_time: T("وقت الإغلاق"),
  debt: T("الدين المتبقي"), movements: T("الحركات المحذوفة معه"), name: T("الاسم"), kind: T("النوع"), opening_receivable: T("الآجل الافتتاحي"), active: T("فعّال"),
};
const AUDIT_ACTIONS = {
  fund_payment: [T("تسجيل دفعة"), 'pos'], fund_payment_delete: [T("حذف دفعة"), 'neg'], fund_member_create: [T("إضافة عضو"), 'pos'], fund_member_update: [T("تعديل عضو"), 'warn'],
  fund_member_delete: [T("حذف عضو"), 'neg'], fund_rate: [T("تغيير الاشتراك الشهري"), 'warn'], fund_settings: [T("تعديل إعدادات الصندوق"), 'warn'],
  fund_category_create: [T("إضافة فئة اشتراك"), 'pos'], fund_category_update: [T("تعديل فئة اشتراك"), 'warn'], fund_loan_create: [T("تسجيل قرض"), 'info'],
  fund_loan_update: [T("تعديل قرض"), 'warn'], fund_loan_delete: [T("حذف قرض"), 'neg'], fund_account_create: [T("إنشاء حساب دخول لعضو"), 'pos'], fund_account_password: [T("تغيير كلمة مرور عضو"), 'warn'], fund_account_link: [T("ربط عضو بحساب موجود"), 'pos'], fund_account_unlink: [T("فك ربط حساب عضو"), 'warn'], fund_import: [T("استيراد بيانات"), 'info'],
  fund_request_create: [T("طلب قرض جديد"), 'info'], fund_request_cancel: [T("إلغاء طلب قرض"), 'muted'], fund_request_reject: [T("رفض طلب قرض"), 'neg'], fund_request_approve: [T("موافقة على طلب قرض"), 'pos'], fund_banner: [T("تعديل البانرات"), 'muted'], fund_banner_delete: [T("حذف بانر"), 'neg'], fund_report_request: [T("طلب عرض التقرير بالأسماء"), 'info'], fund_report_approve: [T("موافقة على عرض الأسماء"), 'warn'], fund_report_reject: [T("رفض عرض الأسماء"), 'muted'], fund_report_revoke: [T("إيقاف عرض الأسماء"), 'muted'], fund_goal_create: [T("هدف جديد"), 'pos'], fund_goal_update: [T("تعديل هدف"), 'warn'], fund_goal_delete: [T("حذف هدف"), 'neg'], fund_gift: [T("مساهمة في هدف"), 'pos'], fund_gift_delete: [T("حذف مساهمة"), 'neg'], fund_statements_send: [T("إرسال الكشوفات الشهرية"), 'info'],
  tx_create: [T("إضافة فاتورة/حركة"), 'pos'], tx_update: [T("تعديل حركة"), 'warn'], tx_delete: [T("حذف حركة"), 'neg'],
  shift_open: [T("بدء يوم عمل (تلقائي)"), 'muted'], shift_close: [T("إقفال يوم"), 'pos'], shift_edit: [T("تعديل أرقام إقفال"), 'warn'], shift_reopen: [T("إلغاء إقفال"), 'neg'],
  cash_receive: [T("استلام النقد"), 'info'], settings_update: [T("تعديل الإعدادات"), 'warn'], logo_update: [T("تغيير الشعار"), 'warn'],
  theme_update: [T("تغيير المظهر"), 'muted'], business_reset: [T("تصفير بيانات النشاط"), 'neg'],
  login: [T("تسجيل دخول"), 'muted'], password_reset_request: [T("طلب استعادة كلمة المرور"), 'warn'], login_failed: [T("محاولة دخول فاشلة"), 'neg'], password_change: [T("تغيير كلمة المرور"), 'warn'], shift_delete: [T("حذف إقفال"), 'neg'], admin_recovery: [T("استعادة كلمة مرور المالك من الاستضافة"), 'neg'], backup_download: [T("تنزيل نسخة احتياطية"), 'info'],
  apps_create: [T("إضافة تطبيق"), 'pos'], apps_update: [T("تعديل تطبيق"), 'warn'], categories_create: [T("إضافة تصنيف"), 'pos'], categories_update: [T("تعديل تصنيف"), 'warn'],
  creditors_create: [T("إضافة دائن"), 'pos'], creditors_update: [T("تعديل دائن"), 'warn'], creditors_delete: [T("حذف دائن"), 'neg'],
};
function fmtVal(k, v) {
  if (v === null || v === undefined || v === '') return '—';
  if (k === 'type') return S.me.txTypes[v] || v;
  if (k === 'payment_method') return S.me.methods[v] || v;
  if (k === 'kind') return v === 'dues' ? T("اشتراك") : v === 'installment' ? T("قسط قرض") : v === 'expense' ? T("مصروفات") : T("مشتريات");
  if (['contributing', 'guardian_access', 'anonymous'].includes(k)) return v ? T("نعم") : T("لا");
  if (['due_day', 'members', 'loan_multiplier'].includes(k)) return String(v);
  if (k === 'active' || k === 'cashier_counts') return v ? T("نعم") : T("لا");
  if (typeof v === 'number') return ['orders_count', 'day_start_hour'].includes(k) ? String(v) : money(v);
  return T(String(v));
}
function changesHTML(before = {}, after = {}) {
  const rows = [];
  const line = (label, b, a) => rows.push(`<div class="chg"><span class="muted">${esc(label)}:</span> <del>${esc(b)}</del> <span class="arr">${ARROW}</span> <b>${esc(a)}</b></div>`);
  for (const k of [...new Set([...Object.keys(before || {}), ...Object.keys(after || {})])]) {
    if (['apps', 'expected_cash'].includes(k)) continue;
    const b = before?.[k], a = after?.[k];
    if (JSON.stringify(b ?? null) === JSON.stringify(a ?? null)) continue;
    line(F_L[k] || k, k === 'difference' ? diffText(b) : fmtVal(k, b), k === 'difference' ? diffText(a) : fmtVal(k, a));
  }
  if (before?.apps || after?.apps) for (const n of [...new Set([...Object.keys(before?.apps || {}), ...Object.keys(after?.apps || {})])]) {
    const b = before?.apps?.[n] || 0, a = after?.apps?.[n] || 0;
    if (b !== a) line(n, money(b), money(a));
  }
  return rows.join('') || ("<span class=\"muted small\">" + T("بدون تغيير في القيم") + "</span>");
}
const diffText = (d) => d === null || d === undefined ? T("لم يُستلم") : Math.abs(d) < .005 ? T("مطابق") : d < 0 ? `${T("عجز")} ${money(-d)}` : `${T("فائض")} ${money(d)}`;
const txLine = (t = {}) => [`<b>${money(t.amount)}</b>`, esc(S.me.txTypes[t.type] || ''), esc(t.supplier || ''), esc(t.category || ''), esc(t.creditor || ''), esc(t.app || ''), esc(t.description || ''), esc(S.me.methods[t.payment_method] || '')].filter(Boolean).join(' · ');
const shiftLine = (s = {}) => `${T("كاش")} ${money(s.cash_sales)} · ${T("شبكة")} ${money(s.card_sales)}${Object.entries(s.apps || {}).map(([n, v]) => ` · ${esc(n)} ${money(v)}`).join('')}`;
function auditBody(r) {
  const d = r.details || {};
  switch (r.action) {
    case 'tx_create': return txLine(d.after || d);
    case 'fund_payment': return `<b>${money(d.amount)}</b> · ${fmtVal('kind', d.kind)} · ${T("شهر")} <span class="num">${esc(d.month)}</span>`;
    case 'fund_payment_delete': return `<span class="muted">${T("المحذوف:")}</span> <b>${money(d.before?.amount)}</b> · ${fmtVal('kind', d.before?.kind)} · ${T("شهر")} <span class="num">${esc(d.before?.month || '')}</span>`;
    case 'fund_gift': return `<b>${money(d.amount)}</b> · ${esc(d.goal || '')} · ${esc(d.member || '')}`;
    case 'fund_statements_send': return `${T("شهر")} <span class="num">${esc(d.month || '')}</span> · ${d.sent} ${T("كشف")}${d.auto ? ` · ${T("تلقائي")}` : ''}`;
    case 'fund_rate': return `${T("من شهر")} <span class="num">${esc(d.from_month)}</span>: ${changesHTML(d.before, d.after)}`;
    case 'fund_account_create': case 'fund_account_password': case 'fund_account_link': case 'fund_account_unlink': return esc(d.username || '');
    case 'tx_delete': return `<span class="muted">${T("المحذوف:")}</span> ${txLine(d.before || d)}`;
    case 'shift_close': return d.after ? shiftLine(d.after) : '';
    case 'login': case 'login_failed': case 'password_change': case 'backup_download': case 'password_reset_request':
      return [d.username ? esc(d.username) : '', d.ip ? `<span class="num muted">IP ${esc(d.ip)}</span>` : ''].filter(Boolean).join(' · ');
    case 'creditors_delete': return Object.entries(d.before || {}).map(([k, v]) => `${F_L[k] || k}: ${esc(fmtVal(k, v))}`).join(' · ');
    case 'shift_delete': return `${T("يوم")} <span class="num">${esc(d.date || '')}</span>${d.before ? ` · ${shiftLine(d.before)}` : ''} · ${d.invoices || 0} ${T("فاتورة")}${d.moved_to ? ` → ${T("نُقلت إلى")} <span class="num">${esc(d.moved_to)}</span>` : ''}`;
    case 'shift_reopen': return d.before ? `<span class="muted">${T("قبل الفتح:")}</span> ${shiftLine(d.before)}` : '';
    case 'shift_open': return d.auto ? ("<span class=\"muted small\">" + T("تلقائياً مع أول عملية") + "</span>") : '';
    case 'cash_receive': return d.before && d.before.counted_cash === null
      ? `${T("استلم")} ${money(d.after?.counted_cash)} — ${T("المتوقع")} ${money(d.after?.expected_cash)} — ${diffText(d.after?.difference)}`
      : changesHTML(d.before, d.after);
    default:
      if (d.before && d.after) return changesHTML(d.before, d.after);
      if (d.after) return Object.entries(d.after).map(([k, v]) => `${F_L[k] || k}: ${esc(fmtVal(k, v))}`).join(' · ');
      return '';
  }
}
const auditObj = (r) => {
  const d = r.details || {};
  if (r.action.startsWith('tx_')) return `${T("حركة")} #${d.id ?? ''}`;
  if (r.action.startsWith('shift_') || r.action === 'cash_receive') return d.date ? `${T("يوم")} ${fmtDate(d.date)}` : '';
  if (d.member) return d.member;
  if (d.before?.member || d.after?.member) return d.before?.member || d.after?.member;
  if (d.after?.name) return d.after.name;
  if (d.before?.name) return d.before.name;
  return '';
};

VIEWS.audit = async (el) => {
  const st = VIEWS.audit.st || (VIEWS.audit.st = { from: addDays(S.me.today, -30), to: S.me.today, user_id: '', kind: 'edits' });
  el.innerHTML = `${pageHead('history', T("سجل التعديلات"), T("من عدّل ماذا ومتى — القيمة قبل وبعد"))}
  <section class="card"><form id="fA" class="fgrid">
    <label>${T("من")}<input type="date" name="from" value="${st.from}"></label><label>${T("إلى")}<input type="date" name="to" value="${st.to}"></label>
    <label>${T("المستخدم")}<select name="user_id"><option value="">${T("الكل")}</option></select></label>
    <label>${T("العرض")}<select name="kind"><option value="edits" ${st.kind === 'edits' ? 'selected' : ''}>${T("التعديلات والحذف واستلام النقد")}</option><option value="all" ${st.kind === 'all' ? 'selected' : ''}>${T("كل العمليات (مع الإضافات والإقفال)")}</option></select></label>
  </form></section>
  <section class="card" id="aList"></section>`;
  const load = async () => {
    Object.assign(st, formObj($('#fA')));
    const d = await bapi('/audit?' + new URLSearchParams(st));
    const us = $('#fA').user_id;
    us.innerHTML = ("<option value=\"\">" + T("الكل") + "</option>") + opt(d.users, st.user_id);
    $('#aList').innerHTML = d.rows.length ? `<div class="tbl-wrap"><table><thead><tr><th>${T("الوقت")}</th><th>${T("بواسطة")}</th><th>${T("العملية")}</th><th>${T("على")}</th><th>${T("التفاصيل")}</th></tr></thead><tbody>
      ${d.rows.map(r => { const [l, c] = AUDIT_ACTIONS[r.action] || [r.action, 'muted'];
        return `<tr><td class="small" style="white-space:nowrap"><span class="num">${r.created_at.slice(0, 10)}</span><br><span class="muted">${r.created_at.slice(11, 16)}</span></td>
        <td><b>${esc(r.user_name || '')}</b></td><td><span class="badge ${c}">${l}</span></td><td class="small">${esc(auditObj(r))}</td><td class="small">${auditBody(r)}</td></tr>`; }).join('')}
      </tbody></table></div>` : ("<div class=\"empty\">" + T("لا توجد عمليات في هذه الفترة") + "</div>");
  };
  $('#fA').onchange = () => load().catch(fail);
  await load();
};

/* ═════════════════════════ reports ═════════════════════════ */
VIEWS.reports = async (el, [tab = 'daily']) => {
  el.innerHTML = `${pageHead('chart', T("التقارير"), '', `
    <div class="seg" style="margin:0"><label><input type="radio" name="rt" value="daily" ${tab === 'daily' ? 'checked' : ''}><span>${icon('calendar')}${T("التقرير اليومي")}</span></label><label><input type="radio" name="rt" value="period" ${tab === 'period' ? 'checked' : ''}><span>${icon('chart')}${T("تقرير فترة")}</span></label></div>
    <button class="btn" onclick="print()">${icon('printer')}${T("طباعة")}</button>`, 'no-print')}<div id="rep"></div>`;
  $$('[name=rt]', el).forEach(r => r.onchange = () => { location.hash = '#/reports/' + r.value; });
  if (tab === 'period') return periodReport($('#rep'));
  return dailyReport($('#rep'));
};

// report building blocks
const rl = (label, v, { note = '', cls = '' } = {}) => `<div class="rl ${cls}"><div class="rl-l">${label}${note ? `<span class="rl-n">${note}</span>` : ''}</div><div class="rl-v">${v === null || v === undefined ? '' : typeof v === 'string' ? v : money(v)}</div></div>`;
const repCard = (ic, title, body, { cls = '', extra = '' } = {}) => `<section class="rep-card ${cls}"><h4>${icon(ic)}<span class="grow">${title}</span>${extra}</h4><div class="rc-b">${body}</div></section>`;
const repHead = (title, sub, chips) => `<div class="rep-head"><div class="rh-ic">${logoURL(S.meta.business) ? `<img class="r-logo" src="${logoURL(S.meta.business)}" alt="">` : icon('fileText')}</div>
  <div class="rh-t"><h2>${title}</h2><div class="rh-sub">${sub}</div></div>${chips}</div>`;
function channelBar(cash, card, apps) {
  const tot = cash + card + apps || 1;
  return `<div class="chan"><i class="c-cash" style="width:${cash / tot * 100}%"></i><i class="c-card" style="width:${card / tot * 100}%"></i><i class="c-apps" style="width:${apps / tot * 100}%"></i></div>
    <div class="chan-leg"><span><i class="c-cash"></i>${T("نقدي")} ${Math.round(cash / tot * 100)}%</span><span><i class="c-card"></i>${T("بطاقة / شبكة")} ${Math.round(card / tot * 100)}%</span><span><i class="c-apps"></i>${T("تطبيقات")} ${Math.round(apps / tot * 100)}%</span></div>`;
}
// debts per creditor: owed at start, added, paid, owed at end
function debtsTable(dp, startLabel) {
  if (!dp || !dp.list.length) return `<p class="muted">${T("لا توجد ديون")}</p>`;
  return `<div class="tbl-wrap"><table class="debt-tbl"><thead><tr><th>${T("الدائن")}</th><th>${startLabel}</th><th>${T("أُضيف")}</th><th>${T("سُدّد")}</th><th>${T("المتبقي")}</th></tr></thead><tbody>
    ${dp.list.map(c => `<tr><td><b>${esc(T(c.name))}</b></td><td class="n">${money(c.start)}</td><td class="n ${c.added ? 'neg-t' : 'muted'}">${c.added ? '+' + money(c.added) : '—'}</td>
      <td class="n ${c.paid ? 'pos-t' : 'muted'}">${c.paid ? '−' + money(c.paid) : '—'}</td><td class="n"><b>${money(c.balance)}</b></td></tr>`).join('')}
    </tbody><tfoot><tr><td>${T("الإجمالي")}</td><td class="n">${money(dp.start)}</td><td class="n">${money(dp.added)}</td><td class="n">${money(dp.paid)}</td><td class="n">${money(dp.total)}</td></tr></tfoot></table></div>`;
}

async function dailyReport(box) {
  const date = dailyReport.date || wd();
  box.innerHTML = `<div class="row no-print" style="justify-content:center;margin-bottom:16px">
    <button class="btn" data-d="-1">${icon('chevL')}${T("اليوم السابق")}</button><input type="date" id="rDate" value="${date}">
    <button class="btn" data-d="1">${T("اليوم التالي")}${icon('chevR')}</button></div><div id="sheet"><div class="empty">${T("جاري التحميل…")}</div></div>`;
  const go = (d) => { dailyReport.date = d; dailyReport(box); };
  $('#rDate', box).onchange = (e) => go(e.target.value);
  $$('[data-d]', box).forEach(b => b.onclick = () => go(addDays(date, Number(b.dataset.d))));
  const d = await bapi('/reports/daily?date=' + date);
  const m = d.movement;
  const other = r2(m.loans + m.owner_deposits);
  const closed = !d.open_shifts && d.shifts.length;
  const status = !d.shifts.length ? `<span class="rh-chip">${T("لا توجد إقفالات")}</span>` : closed ? `<span class="rh-chip">${icon('check')}${T("مقفل")}</span>` : `<span class="rh-chip">${icon('clock')}${T("لم يُقفل بعد")}</span>`;
  const cashRes = d.shifts.filter(s => s.status === 'closed' && s.counted_at).reduce((t, s) => t + s.difference, 0);
  const drawer = d.shifts.length ? d.shifts.map((s, i) => `<div class="drawer-card"><div class="dc-h">${icon('cash')}<span class="grow">${d.shifts.length > 1 ? `${T("إقفال")} ${i + 1} — ` : ''}${esc(s.closed_by_name || s.opened_by_name || '')}${s.closed_at ? ` <span class="muted small">${timeOf(s.closed_at)}</span>` : ''}</span>${countBadge(s)}</div>
      ${s.status === 'open' ? '' : `
      ${rl(T("العهدة الثابتة في الدرج"), s.opening_float, { note: T("لا تُحصر من المبيعات") })}
      ${!S.meta.business.cash_count ? `${rl(T("كاش المبيعات") + ' +', s.cash_sales, { cls: 'plus' })}${s.drawer_out ? rl(T("مدفوع كاش من الدرج") + ' −', s.drawer_out, { cls: 'minus' }) : ''}
      ${rl(T("إجمالي النقد في الدرج"), s.expected_cash, { note: T("العهدة + الكاش − ما دُفع كاش من الدرج"), cls: 'total' })}
      ${rl(T("صافي النقد (بلا العهدة)"), r2(s.expected_cash - s.opening_float), { cls: 'hl' })}` : rl(T("النقد المتوقع"), s.expected_cash, { note: T("العهدة + الكاش − فواتير الدرج") })}
      ${s.counted_at ? `${rl(T("الدرج المعدود فعلاً"), s.counted_cash)}${s.cash_with_staff ? rl(T("نقد عند الموظفين"), s.cash_with_staff) : ''}
      ${rl(T("إجمالي النقد باليد (بلا العهدة)"), r2(s.counted_cash + s.cash_with_staff - s.opening_float), { cls: 'total' })}` : ''}`}</div>`).join('')
    : `<p class="muted">${T("لا توجد شفتات لهذا اليوم")}</p>`;
  $('#sheet', box).innerHTML = `<div class="report">
    ${repHead(T("التقرير اليومي"), esc(T(d.business)), `<span class="rh-chip">${icon('calendar')}${fmtDate(d.date)}</span>${status}`)}
    ${d.open_shifts ? `<div class="banner warn">${icon('alert')}<span class="grow">${T("هذا اليوم لم يُقفل بعد — مبيعاته لم تُحتسب")}</span></div>` : ''}
    <div class="rep-kpis">
      ${kpi(T("إجمالي المبيعات"), m.sales.total, 'accent', `${m.sales.orders} ${T("طلب")} · ${T("متوسط")} ${money(m.sales.avg)}`, 'trendUp')}
      ${kpi(T("صافي حركة اليوم"), m.net_movement, m.net_movement < 0 ? 'neg' : 'pos', '', 'scale')}
      ${kpi(T("رصيد الشركة نهاية اليوم"), d.end_balance, '', `${T("منها آجل")} ${money(d.receivables.total)}`, 'wallet')}
      ${kpi(T("إجمالي الديون"), d.debts.total, 'warn', d.debts_day.paid ? `${T("سُدّد اليوم")} ${money(d.debts_day.paid)}` : '', 'landmark')}
    </div>
    <div class="rep-grid">
      ${repCard('trendUp', T("المبيعات"), `${channelBar(m.sales.cash, m.sales.card, m.sales.apps)}
        ${rl(`<span class="lbl-ic">${icon('cash')}${T("نقدي")}</span>`, m.sales.cash)}${rl(`<span class="lbl-ic">${icon('card')}${T("بطاقة / شبكة")}</span>`, m.sales.card)}
        ${m.sales.byApp.filter(a => a.amount).map(a => rl(`<span class="lbl-ic">${icon('truck')}${esc(T(a.name))}</span>`, a.amount, { note: T("آجل — تُطالب لاحقاً"), cls: 'sub' })).join('')}
        ${rl(T("إجمالي المبيعات"), m.sales.total, { cls: 'total' })}
        ${rl(T("عدد الطلبات"), String(m.sales.orders), { cls: 'muted-row' })}${rl(T("متوسط قيمة الطلب"), m.sales.avg, { cls: 'muted-row' })}`)}
      ${repCard('wallet', T("حساب رصيد الشركة"), `
        ${rl(T("الرصيد السابق"), d.prev_balance)}
        ${rl(T("مبيعات اليوم") + ' +', m.sales.total, { cls: 'plus' })}
        ${m.card_fee ? rl(`${T("رسوم البطاقة")} (${d.card_fee_pct}%) −`, m.card_fee, { cls: 'minus' }) : ''}
        ${m.purchases_paid ? rl(T("مشتريات مدفوعة") + ' −', m.purchases_paid, { cls: 'minus' }) : ''}
        ${m.expenses_paid ? rl(T("مصروفات مدفوعة") + ' −', m.expenses_paid, { cls: 'minus' }) : ''}
        ${m.debt_payments ? rl(T("سداد ديون") + ' −', m.debt_payments, { cls: 'minus' }) : ''}
        ${m.withdrawals ? rl(T("مسحوبات المالك") + ' −', m.withdrawals, { cls: 'minus' }) : ''}
        ${m.app_commission ? rl(T("عمولات التطبيقات") + ' −', m.app_commission, { cls: 'minus' }) : ''}
        ${other ? rl(T("تمويل وإيداعات") + ' +', other, { cls: 'plus' }) : ''}
        ${m.adjustments ? rl(T("تسويات") + ' ±', m.adjustments) : ''}
        ${m.cash_diff ? rl(T("فروقات الجرد") + ' ±', m.cash_diff, { cls: m.cash_diff < 0 ? 'minus' : 'plus' }) : ''}
        ${m.purchases_credit + m.expenses_credit ? rl(T("مشتريات ومصروفات على الدين"), r2(m.purchases_credit + m.expenses_credit), { note: T("لا تمس الرصيد — تُضاف للديون"), cls: 'muted-row' }) : ''}
        ${rl(T("صافي حركة اليوم"), m.net_movement, { cls: 'total' })}
        ${rl(T("رصيد الشركة نهاية اليوم"), d.end_balance, { cls: 'hl' })}
        ${rl(T("آجله منها (لدى التطبيقات)"), d.receivables.total, { cls: 'hl' })}`)}
      ${repCard('cash', S.meta.business.cash_count ? T("النقد — جرد الدرج") : T("النقد"), drawer, { extra: d.shifts.some(s => s.counted_at) ? diffBadge(r2(cashRes)) : '' })}
      ${repCard('landmark', T("الديون — لمن وكم"), `${debtsTable(d.debts_day, T("بداية اليوم"))}
        <div style="margin-top:10px">${rl(T("تغطية رصيد الشركة للديون"), d.coverage === null ? '—' : `<span class="prog-cell"><span class="progress"><i style="width:${Math.min(100, d.coverage || 0)}%"></i></span>${d.coverage}%</span>`)}
        ${rl(T("صافي المركز"), d.net_position, { cls: d.net_position < 0 ? 'bad' : 'hl' })}</div>`)}
      ${repCard('list', `${T("حركات اليوم")} (${d.transactions.length})`, d.transactions.length ? `<div class="tbl-wrap"><table><thead><tr><th>${T("النوع")}</th><th>${T("البيان")}</th><th>${T("الدفع")}</th><th>${T("المبلغ")}</th></tr></thead><tbody>
        ${d.transactions.map(t => `<tr><td>${esc(S.me.txTypes[t.type])}</td><td class="small">${txDesc(t)}${itemsHTML(t.items)}</td><td class="small muted">${esc(S.me.methods[t.payment_method])}</td><td>${signedAmount(t)}</td></tr>`).join('')}</tbody></table></div>` : `<p class="muted">${T("لا توجد")}</p>`, { cls: 'full' })}
      ${d.shifts.some(s => s.notes) ? repCard('fileText', T("ملاحظات اليوم"), `<p>${d.shifts.filter(s => s.notes).map(s => esc(s.notes)).join('<br>')}</p>`, { cls: 'full' }) : ''}
    </div></div>`;
}

// simple SVG bar chart: sales vs purchases+expenses per day (reads in page direction)
function barChart(days) {
  const W = 800, H = 220, P = { t: 12, b: 26, s: 46 }, rtl = document.documentElement.dir === 'rtl';
  const max = Math.max(1, ...days.map(x => Math.max(x.sales, x.purchases + x.expenses)));
  const step = Math.pow(10, Math.floor(Math.log10(max))); const top = Math.ceil(max / step) * step;
  const iw = W - P.s - 8, ih = H - P.t - P.b, n = days.length, slot = iw / n, bw = Math.max(2, Math.min(16, slot / 2.6));
  const xOf = (i) => rtl ? 8 + iw - (i + 0.5) * slot : P.s + (i + 0.5) * slot;
  const y = (v) => P.t + ih - v / top * ih;
  let g = '';
  for (let k = 0; k <= 4; k++) { const v = top * k / 4, yy = y(v); g += `<line class="gl" x1="${rtl ? 8 : P.s}" x2="${rtl ? W - P.s : W - 8}" y1="${yy}" y2="${yy}"/><text x="${rtl ? W - P.s + 6 : P.s - 6}" y="${yy + 4}" text-anchor="${rtl ? 'start' : 'end'}">${Math.round(v).toLocaleString('en-US')}</text>`; }
  const every = Math.ceil(n / 12);
  days.forEach((x, i) => {
    const cx = xOf(i), o = x.purchases + x.expenses;
    g += `<rect class="bs" x="${cx - bw - 1}" y="${y(x.sales)}" width="${bw}" height="${Math.max(0, P.t + ih - y(x.sales))}" rx="2"><title>${fmtDate(x.date)} — ${money(x.sales)}</title></rect>`;
    g += `<rect class="bo" x="${cx + 1}" y="${y(o)}" width="${bw}" height="${Math.max(0, P.t + ih - y(o))}" rx="2"><title>${fmtDate(x.date)} — ${money(o)}</title></rect>`;
    if (i % every === 0) g += `<text x="${cx}" y="${H - 8}" text-anchor="middle">${x.date.slice(8)}/${x.date.slice(5, 7)}</text>`;
  });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${g}</svg>
    <div class="legend"><span><i style="background:var(--brand)"></i>${T("المبيعات")}</span><span><i style="background:var(--chart-out)"></i>${T("المشتريات والمصروفات")}</span></div>`;
}

async function periodReport(box) {
  const st = periodReport.st || (periodReport.st = { from: wd().slice(0, 8) + '01', to: wd() });
  const t = wd(), lmEnd = addDays(t.slice(0, 8) + '01', -1);
  box.innerHTML = `<section class="card no-print"><form id="fP" class="row">
    <label>${T("من")}<input type="date" name="from" value="${st.from}"></label><label>${T("إلى")}<input type="date" name="to" value="${st.to}"></label>
    <span class="row" style="align-self:end"><button type="button" class="btn sm" data-r="${addDays(t, -6)}|${t}">${T("آخر 7 أيام")}</button>
    <button type="button" class="btn sm" data-r="${t.slice(0, 8)}01|${t}">${T("هذا الشهر")}</button>
    <button type="button" class="btn sm" data-r="${lmEnd.slice(0, 8)}01|${lmEnd}">${T("الشهر الماضي")}</button></span></form></section><div id="pr"><div class="empty">${T("جاري التحميل…")}</div></div>`;
  const go = () => periodReport(box);
  $('#fP', box).onchange = () => { Object.assign(st, formObj($('#fP', box))); go(); };
  $$('[data-r]', box).forEach(b => b.onclick = () => { [st.from, st.to] = b.dataset.r.split('|'); go(); });
  const d = await bapi('/reports/period?' + new URLSearchParams(st));
  const cc = !!S.meta.business.cash_count;
  const m = d.movement;
  const cats = (type) => { const l = d.byCategory.filter(c => c.type === type); const mx = Math.max(1, ...l.map(c => c.amount)); const tot = l.reduce((a, c) => a + c.amount, 0);
    return l.length ? `<table><tbody>${l.map(c => `<tr><td>${esc(T(c.name))}</td><td style="width:38%"><div class="hbar"><i style="width:${c.amount / mx * 100}%"></i></div></td><td class="n">${money(c.amount)}</td><td class="small muted">${tot ? Math.round(c.amount / tot * 100) : 0}%</td></tr>`).join('')}</tbody></table>` : `<p class="muted">${T("لا يوجد")}</p>`; };
  $('#pr', box).innerHTML = `<div class="report" style="max-width:none">
    ${repHead(T("تقرير فترة"), esc(T(d.business)), `<span class="rh-chip">${icon('calendar')}${d.from} — ${d.to}</span>`)}
    <div class="rep-kpis">
      ${kpi(T("إجمالي المبيعات"), m.sales.total, 'accent', `${m.sales.orders} ${T("طلب")} · ${T("متوسط")} ${money(m.sales.avg)}`, 'trendUp')}
      ${kpi(T("المشتريات"), m.purchases_paid + m.purchases_credit, '', m.purchases_credit ? `${T("منها على الدين")} ${money(m.purchases_credit)}` : '', 'cart')}
      ${kpi(T("المصروفات"), m.expenses_paid + m.expenses_credit, '', m.expenses_credit ? `${T("منها على الدين")} ${money(m.expenses_credit)}` : '', 'fileText')}
      ${kpi(T("النتيجة التشغيلية"), m.operating_result, m.operating_result < 0 ? 'neg' : 'pos', T("المبيعات − الرسوم والعمولات − المشتريات والمصروفات"), 'scale')}
    </div>
    <div class="rep-grid">
      ${d.days.length ? repCard('chart', T("المبيعات مقابل المشتريات يومياً"), barChart(d.days), { cls: 'full' }) : ''}
      ${repCard('trendUp', T("المبيعات حسب القناة"), `${channelBar(m.sales.cash, m.sales.card, m.sales.apps)}
        ${rl(`<span class="lbl-ic">${icon('cash')}${T("نقدي")}</span>`, m.sales.cash)}${rl(`<span class="lbl-ic">${icon('card')}${T("بطاقة / شبكة")}</span>`, m.sales.card)}
        ${m.sales.byApp.filter(a => a.amount).map(a => rl(`<span class="lbl-ic">${icon('truck')}${esc(T(a.name))}</span>`, a.amount, { note: T("آجل"), cls: 'sub' })).join('')}
        ${rl(T("رسوم البطاقة"), -m.card_fee, { cls: 'minus' })}${rl(T("عمولات التطبيقات (المُحصّلة)"), -m.app_commission, { cls: 'minus' })}`)}
      ${repCard('wallet', T("رصيد الشركة"), `${rl(T("رصيد بداية الفترة"), d.start_balance)}${rl(T("صافي الحركة"), m.net_movement, { cls: m.net_movement < 0 ? 'minus' : 'plus' })}
        ${rl(T("سداد ديون"), m.debt_payments, { cls: 'muted-row' })}${rl(T("تمويل وديون جديدة"), m.loans, { cls: 'muted-row' })}
        ${rl(T("مسحوبات المالك"), m.withdrawals, { cls: 'muted-row' })}${rl(T("تحصيل من التطبيقات"), m.app_collected, { cls: 'muted-row' })}
        ${rl(T("رصيد نهاية الفترة"), d.end_balance, { cls: 'hl' })}`)}
      ${repCard('cart', T("المشتريات حسب التصنيف"), cats('purchase'))}
      ${repCard('fileText', T("المصروفات حسب التصنيف"), cats('expense'))}
      ${repCard('store', T("أكبر الموردين"), d.bySupplier.length ? `<table><tbody>${d.bySupplier.map(s => `<tr><td>${esc(T(s.name))}</td><td class="small muted">${s.n} ${T("فاتورة")}</td><td class="n">${money(s.amount)}</td></tr>`).join('')}</tbody></table>` : `<p class="muted">${T("لا يوجد")}</p>`)}
      ${repCard('cash', T("النقد"), `${rl(T("كاش المبيعات") + ' +', m.sales.cash, { cls: 'plus' })}${rl(T("مدفوع كاش من الدرج") + ' −', m.cash_out, { cls: 'minus' })}
        ${rl(T("صافي النقد"), m.cash_net, { cls: 'total', note: T("الكاش المسلَّم في الفترة (بلا العهدة الثابتة)") })}
        ${m.card_paid ? rl(T("مشتريات دُفعت شبكة"), m.card_paid, { cls: 'muted-row', note: T("لم تخرج من الدرج") }) : ''}`)}
      ${!cc ? '' : repCard('users', T("فروقات الجرد حسب الكاشير"), `<div class="row small" style="margin:8px 0"><span class="badge neg">${T("إجمالي العجز")} ${money(-m.shortage)}</span><span class="badge warn">${T("إجمالي الفائض")} ${money(m.surplus)}</span></div>
        ${d.byCashier.length ? `<div class="tbl-wrap"><table><thead><tr><th>${T("الكاشير")}</th><th>${T("شفتات")}</th><th>${T("مطابق")}</th><th>${T("لم يُستلم")}</th><th>${T("الصافي")}</th></tr></thead><tbody>${d.byCashier.map(c => `<tr><td>${esc(c.name || '—')}</td><td>${c.shifts}</td><td>${c.exact}</td><td>${c.pending || ''}</td><td>${diffBadge(c.diff)}</td></tr>`).join('')}</tbody></table></div>` : `<p class="muted">${T("لا يوجد")}</p>`}`)}
      ${repCard('landmark', T("الديون — لمن وكم"), debtsTable(d.debts, T("بداية الفترة")), { cls: 'full' })}
      ${repCard('calendar', T("التفصيل اليومي"), d.days.length ? `<div class="tbl-wrap"><table><thead><tr><th>${T("اليوم")}</th><th>${T("نقدي")}</th><th>${T("بطاقة")}</th><th>${T("تطبيقات")}</th><th>${T("المبيعات")}</th><th>${T("الطلبات")}</th><th>${T("المشتريات")}</th><th>${T("المصروفات")}</th><th>${T("النتيجة")}</th><th>${cc ? T("الجرد") : T("صافي النقد")}</th></tr></thead><tbody>
        ${d.days.map(x => `<tr class="click" data-day="${x.date}"><td style="white-space:nowrap">${fmtDate(x.date)}</td><td class="n">${money(x.cash)}</td><td class="n">${money(x.card)}</td><td class="n">${money(x.apps)}</td><td class="n"><b>${money(x.sales)}</b></td><td>${x.orders}</td><td class="n">${money(x.purchases)}</td><td class="n">${money(x.expenses)}</td><td class="n ${x.result < 0 ? 'neg-t' : ''}">${money(x.result)}</td><td${cc ? '' : ' class="n"'}>${cc ? diffBadge(x.diff) : money(x.cash_net)}</td></tr>`).join('')}
        </tbody><tfoot><tr><td>${T("الإجمالي")}</td><td class="n">${money(m.sales.cash)}</td><td class="n">${money(m.sales.card)}</td><td class="n">${money(m.sales.apps)}</td><td class="n">${money(m.sales.total)}</td><td>${m.sales.orders}</td><td class="n">${money(m.purchases_paid + m.purchases_credit)}</td><td class="n">${money(m.expenses_paid + m.expenses_credit)}</td><td class="n">${money(m.operating_result)}</td><td${cc ? '' : ' class="n"'}>${cc ? diffBadge(m.cash_diff) : money(m.cash_net)}</td></tr></tfoot></table></div>
        <p class="muted small no-print">${T("اضغط على أي يوم لفتح تقريره اليومي")}.</p>` : `<p class="muted">${T("لا توجد بيانات")}</p>`, { cls: 'full' })}
    </div></div>`;
  $$('[data-day]', box).forEach(r => r.onclick = () => { dailyReport.date = r.dataset.day; location.hash = '#/reports/daily'; });
}


/* ═════════════════════════ finance: receivables & debts ═════════════════════════ */
VIEWS.finance = async (el) => {
  const d = await bapi('/balances');
  const fin = can('finance_manage');
  const net = r2(d.balance - d.debts.total);
  el.innerHTML = `
  ${pageHead('wallet', T("التحصيل والديون"), '', fin ? `<button class="btn" data-t="withdrawal">${icon('arrowUp')}${T("مسحوبات المالك")}</button><button class="btn" data-t="owner_deposit">${icon('arrowDown')}${T("إيداع من المالك")}</button><button class="btn" data-t="adjustment">${icon('sliders')}${T("تسوية رصيد")}</button>` : '')}
  <div class="grid kpis">${kpi(T("رصيد الشركة"), d.balance, 'accent', '', 'wallet')}${kpi(T("آجل لدى التطبيقات"), d.receivables.total, '', '', 'truck')}${kpi(T("إجمالي الديون"), d.debts.total, 'warn', '', 'landmark')}${kpi(T("صافي المركز"), net, net < 0 ? 'neg' : 'pos', '', 'scale')}</div>
  <section class="card"><div class="card-head"><h3>${icon('truck')}${T("مستحقات تطبيقات التوصيل (آجل)")}</h3></div>
    <div class="tbl-wrap"><table><thead><tr><th>${T("التطبيق")}</th><th>${T("رصيد افتتاحي")}</th><th>${T("مبيعات")}</th><th>${T("تم تحصيله")}</th><th>${T("المتبقي")}</th><th></th></tr></thead><tbody>
    ${d.receivables.list.map(a => `<tr><td><b>${esc(T(a.name))}</b>${a.active ? '' : ` <span class="badge muted">${T("مخفي")}</span>`}</td><td class="n">${money(a.opening_receivable)}</td><td class="n">${money(a.sold)}</td><td class="n">${money(a.collected)}</td><td class="n"><b>${money(a.balance)}</b></td>
      <td class="row-acts">${fin ? `<button class="btn sm soft" data-settle="${a.id}">${icon('download')}${T("تسجيل تحصيل")}</button>` : ''}</td></tr>`).join('')}
    </tbody><tfoot><tr><td>${T("الإجمالي")}</td><td></td><td></td><td></td><td class="n">${money(d.receivables.total)}</td><td></td></tr></tfoot></table></div></section>
  <section class="card"><div class="card-head"><h3>${icon('landmark')}${T("الديون والدائنون")}</h3>${fin || can('settings_manage') ? `<button class="btn sm" id="bCred">${icon('plus')}${T("دائن جديد")}</button>` : ''}</div>
    ${d.debts.list.length ? `<div class="tbl-wrap"><table><thead><tr><th>${T("الدائن")}</th><th>${T("أصل الدين")}</th><th>${T("سُدّد")}</th><th>${T("المتبقي")}</th><th>${T("نسبة السداد")}</th><th></th></tr></thead><tbody>
    ${d.debts.list.map(c => { const orig = r2(c.opening_balance + c.added), pct = orig > 0 ? Math.min(100, Math.round(c.paid / orig * 100)) : 0;
      return `<tr><td><b>${esc(T(c.name))}</b>${c.active ? '' : ` <span class="badge muted">${T("مخفي")}</span>`}</td><td class="n">${money(orig)}</td><td class="n pos-t">${money(c.paid)}</td><td class="n"><b>${money(c.balance)}</b></td>
      <td><span class="prog-cell"><span class="progress"><i style="width:${pct}%"></i></span><span class="small muted num">${pct}%</span></span></td>
      <td class="row-acts">${fin ? `<button class="btn sm primary" data-pay="${c.id}" ${c.balance <= 0 ? 'disabled' : ''}>${icon('hand')}${T("سداد")}</button>
        <button class="icon-btn" data-loan="${c.id}" title="${T("دين جديد")}">${icon('plus')}</button>
        <button class="icon-btn" data-wo="${c.id}" title="${T("إسقاط دين")}" ${c.balance <= 0 ? 'disabled' : ''}>${icon('minusCircle')}</button>` : ''}
        ${can('tx_view_all') ? `<button class="icon-btn" data-mov="${c.id}" title="${T("الحركات")}">${icon('list')}</button>` : ''}
        ${fin || can('settings_manage') ? `<button class="icon-btn danger" data-cdel="${c.id}" title="${T("حذف")}">${icon('trash')}</button>` : ''}</td></tr>`; }).join('')}
    </tbody><tfoot><tr><td>${T("الإجمالي")}</td><td></td><td></td><td class="n">${money(d.debts.total)}</td><td></td><td></td></tr></tfoot></table></div>` : `<p class="muted">${T("لا يوجد دائنون. أضف الموردين الذين تشتري منهم بالآجل، أو جهات التمويل (مثل صندوق العائلة)")}.</p>`}</section>`;
  const reload = async () => { await loadMeta(); VIEWS.finance(el); };
  const cr = (id) => d.debts.list.find(c => c.id == id);
  $$('[data-t]', el).forEach(b => b.onclick = () => openTxModal({ types: [b.dataset.t], title: S.me.txTypes[b.dataset.t], onSaved: reload }));
  $$('[data-settle]', el).forEach(b => b.onclick = () => openTxModal({ types: ['app_settlement'], title: T("تحصيل من تطبيق توصيل"), preset: { app_id: b.dataset.settle }, onSaved: reload }));
  $$('[data-pay]', el).forEach(b => b.onclick = () => payDebt(cr(b.dataset.pay), 'debt_payment', reload));
  $$('[data-wo]', el).forEach(b => b.onclick = () => payDebt(cr(b.dataset.wo), 'debt_writeoff', reload));
  $$('[data-loan]', el).forEach(b => b.onclick = () => openTxModal({ types: ['loan'], title: T("دين / تمويل جديد"), preset: { creditor_id: b.dataset.loan }, onSaved: reload }));
  $$('[data-mov]', el).forEach(b => b.onclick = () => creditorMovements(cr(b.dataset.mov), reload));
  $$('[data-cdel]', el).forEach(b => b.onclick = () => deleteCreditor(cr(b.dataset.cdel), reload));
  if ($('#bCred')) $('#bCred').onclick = () => listItemModal('creditors', null, reload);
};

// full or partial payment (or write-off) of one creditor's debt
function payDebt(c, type, after) {
  const wo = type === 'debt_writeoff';
  const orig = r2(c.opening_balance + c.added), pct = orig > 0 ? Math.min(100, Math.round(c.paid / orig * 100)) : 0;
  const m = modal(`${wo ? T("إسقاط / تخفيض دين") : T("سداد دين")} — ${T(c.name)}`, `<form autocomplete="off">
    <div class="summary-box">
      <div class="r"><span>${T("أصل الدين")}</span>${M(orig)}</div><div class="r"><span>${T("سُدّد سابقاً")}</span><span class="pos-t">${M(c.paid)}</span></div>
      <div class="r t"><span>${T("المتبقي الآن")}</span>${M(c.balance)}</div>
      <div class="prog-cell" style="margin-top:8px"><span class="progress"><i style="width:${pct}%"></i></span><span class="small muted num">${pct}%</span></div>
    </div>
    <label class="big">${wo ? T("المبلغ المُسقط") : T("مبلغ السداد")}<input name="amount" type="number" step="0.01" min="0.01" max="${c.balance}" inputmode="decimal" required></label>
    <div class="row" style="margin:-4px 0 14px">
      <button type="button" class="btn sm soft" data-part="1">${T("كامل المتبقي")}</button>
      <button type="button" class="btn sm" data-part="0.5">${T("النصف")}</button>
      <button type="button" class="btn sm" data-part="0.25">${T("الربع")}</button>
    </div>
    <div class="fgrid">
      ${wo ? '' : `<label>${T("طريقة الدفع")}<select name="payment_method"><option value="company">${S.me.methods.company}</option><option value="drawer">${S.me.methods.drawer}</option></select></label>`}
      <label>${T("التاريخ")}<input type="date" name="date" value="${wd()}"></label>
      <label class="full">${T("ملاحظة")}<input name="description" placeholder="${wo ? T("سبب الإسقاط") : ''}"></label>
    </div>
    <div class="io" id="payIO"></div>
    <div class="mf"><button class="btn primary">${icon('check')}${wo ? T("تأكيد الإسقاط") : T("تأكيد السداد")}</button><button type="button" class="btn" data-x>${T("إلغاء")}</button></div></form>`);
  const f = $('form', m.el);
  const draw = () => {
    const v = r2(f.amount.value), left = r2(c.balance - v), over = v > c.balance + 0.005;
    $('#payIO', m.el).innerHTML = !v ? '' : over
      ? `<div class="io-sec outs"><div class="io-h">${icon('alert')}${T("المبلغ أكبر من الدين المتبقي")}</div></div>`
      : `<div class="io-sec ${left <= 0 ? 'in' : 'net'}"><div class="r t" style="border:0;margin:0;padding:0"><span>${left <= 0 ? T("سيُسدَّد الدين بالكامل") : T("سيبقى بعد هذه الدفعة")}</span>${left > 0 ? `<b>${M(left)}</b>` : icon('check')}</div>
        <div class="r small"><span>${left > 0 ? T("سداد جزئي") : ''}</span><span class="num">${Math.min(100, Math.round((c.paid + v) / (orig || 1) * 100))}%</span></div></div>`;
    $('button.primary', m.el).disabled = over;
  };
  f.addEventListener('input', draw);
  $$('[data-part]', m.el).forEach(b => b.onclick = () => { f.amount.value = r2(c.balance * Number(b.dataset.part)); draw(); });
  f.onsubmit = (e) => {
    e.preventDefault();
    busy(e.submitter, async () => {
      await bapi('/transactions', { method: 'POST', body: { ...formObj(f), type, creditor_id: c.id, payment_method: wo ? 'company' : f.payment_method.value } });
      const left = r2(c.balance - r2(f.amount.value));
      m.close(); toast(left > 0 ? `${T("تم السداد — المتبقي")} ${money(left)}` : T("تم سداد الدين بالكامل"), 'ok'); after();
    });
  };
}

// all movements of one creditor, each can be edited / deleted (with tx_edit)
async function creditorMovements(c, after) {
  const rows = await bapi('/transactions?' + new URLSearchParams({ creditor_id: c.id, from: '2000-01-01', to: '9999-12-31' })).catch(fail);
  if (!rows) return;
  const effect = (t) => t.type === 'debt_payment' || t.type === 'debt_writeoff' ? -t.amount : t.amount;
  const m = modal(`${T(c.name)} — ${T("حركات الدين")}`, `
    <div class="summary-box"><div class="r"><span>${T("الدين الافتتاحي")}</span>${M(c.opening_balance)}</div><div class="r t"><span>${T("المتبقي الآن")}</span>${M(c.balance)}</div></div>
    ${rows.length ? `<div class="tbl-wrap"><table><thead><tr><th>${T("التاريخ")}</th><th>${T("النوع")}</th><th>${T("البيان")}</th><th>${T("على الدين")}</th><th></th></tr></thead><tbody>
    ${rows.map(t => `<tr><td class="small" style="white-space:nowrap">${dayName(t.date)}<br>${t.date}</td><td>${esc(S.me.txTypes[t.type])}</td><td class="small">${esc(t.supplier || t.description || '')}${itemsHTML(t.items)}</td>
      <td class="n ${effect(t) < 0 ? 'pos-t' : 'neg-t'}">${effect(t) > 0 ? '+' : ''}${money(effect(t))}</td>
      <td class="row-acts">${can('tx_edit') ? `<button class="icon-btn" data-ed="${t.id}" title="${T("تعديل")}">${icon('edit')}</button><button class="icon-btn danger" data-del="${t.id}" title="${T("حذف")}">${icon('trash')}</button>` : ''}</td></tr>`).join('')}
    </tbody></table></div>` : `<p class="muted">${T("لا توجد حركات — الدين كله افتتاحي (يُعدّل من «تعديل» في إعدادات الدائنين)")}.</p>`}`, { wide: true });
  const refresh = () => { m.close(); after(); };
  $$('[data-del]', m.el).forEach(b => b.onclick = () => deleteTx(rows.find(t => t.id == b.dataset.del), refresh));
  $$('[data-ed]', m.el).forEach(b => b.onclick = () => openTxModal({ tx: rows.find(t => t.id == b.dataset.ed), onSaved: refresh }));
}

async function deleteCreditor(c, after) {
  let rows = [];
  if (can('tx_view_all')) rows = await bapi('/transactions?' + new URLSearchParams({ creditor_id: c.id, from: '2000-01-01', to: '9999-12-31' })).catch(() => []);
  // money that will come back to the company balance when its payments are removed
  const back = r2(rows.reduce((s, t) => s + (t.type === 'debt_payment' ? t.amount : t.type === 'loan' ? -t.amount : 0), 0));
  const ok = await confirmBox(`${T("حذف الدائن")} «${T(c.name)}»`, `
    <p>${T("سيُحذف الدائن ودينه المتبقي")} <b>${M(c.balance)}</b> ${T("من إجمالي الديون")}.</p>
    ${rows.length ? `<div class="alert warn">${icon('alert')}<div>${T("سيتم حذف")} <b>${rows.length}</b> ${T("حركة مرتبطة به (ديون وسداد ومشتريات آجلة)")}.
      ${back ? `<br>${T("رصيد الشركة سيتغير بمقدار")} <b>${back > 0 ? '+' : ''}${money(back)}</b> ${T("لأن السدادات/التمويلات المحذوفة تُلغى")}.` : ''}</div></div>` : ''}
    <p class="muted small">${T("إذا أردت فقط تصفير الدين بدون حذف السجل، استخدم «إسقاط دين» بدلاً من ذلك. الحذف يُسجّل في سجل التعديلات")}.</p>`, T("حذف نهائي"), true);
  if (!ok) return;
  try {
    const r = await bapi('/creditors/' + c.id, { method: 'DELETE' });
    toast(`${T("تم حذف")} «${T(c.name)}»${r.deleted_movements ? ` + ${r.deleted_movements} ${T("حركات")}` : ''}`, 'ok'); after();
  } catch (e) { fail(e); }
}


/* ═════════════════════════ business settings ═════════════════════════ */
const LIST_DEF = {
  apps: { title: T("تطبيق توصيل"), fields: [['name', T("الاسم")], ['opening_receivable', T("رصيد آجل افتتاحي"), 'number']] },
  categories: { title: T("تصنيف"), fields: [['name', T("الاسم")], ['kind', T("النوع"), 'kind']] },
  creditors: { title: T("دائن / مورد آجل"), fields: [['name', T("الاسم")], ['opening_balance', T("الدين الافتتاحي (القائم حالياً)"), 'number']] },
};
function listItemModal(key, item, after, preset = {}) {
  const D = LIST_DEF[key];
  const m = modal((item ? (T("تعديل") + " ") : (T("إضافة") + " ")) + D.title, `<form>${D.fields.map(([k, l, t]) => t === 'kind'
    ? `<label>${l}<select name="${k}">${opt([['purchase', T("مشتريات")], ['expense', T("مصروفات")]], item?.[k] || preset[k] || 'purchase', x => x)}</select></label>`
    : `<label>${l}<input name="${k}" ${t === 'number' ? 'type="number" step="0.01"' : 'required'} value="${esc(item?.[k] ?? (t === 'number' ? 0 : ''))}"></label>`).join('')}
    ${item ? `<label class="check"><input type="checkbox" name="active" ${item.active ? 'checked' : ''}> ${T("ظاهر (غير مخفي)")}</label>` : ''}
    <div class="mf"><button class="btn primary">${T("حفظ")}</button></div></form>`);
  $('form', m.el).onsubmit = (e) => {
    e.preventDefault();
    busy(e.submitter, async () => {
      const body = formObj(e.target);
      if (item) { body.active = e.target.active.checked; await bapi(`/${key}/${item.id}`, { method: 'PUT', body }); }
      else await bapi('/' + key, { method: 'POST', body });
      m.close(); toast(T("تم الحفظ"), 'ok'); after();
    });
  };
}
// shrink the chosen image in the browser so the stored logo stays small
function resizeImage(file, max = 320) {
  return new Promise((resolve, reject) => {
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return reject(new Error((T("اختر صورة بصيغة") + " PNG " + T("أو") + " JPG")));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(file.type === 'image/jpeg' ? c.toDataURL('image/jpeg', 0.9) : c.toDataURL('image/png'));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(T("تعذّر قراءة الصورة"))); };
    img.src = url;
  });
}
// reload business list (name / logo changed) and redraw the header
async function refreshBusinesses() {
  S.me = await api('/me');
  await loadMeta();
  const sel = $('#bizSel');
  if (sel) sel.innerHTML = opt(S.me.businesses, S.bid);
  refreshHeaderLogo();
}
function bindLogoBox(box, after) {
  const file = $('[data-logo-file]', box), del = $('[data-logo-del]', box);
  file.onchange = async () => {
    const f = file.files[0]; if (!f) return;
    try {
      const data = await resizeImage(f);
      await bapi('/logo', { method: 'PUT', body: { data } });
      toast((T("تم حفظ الشعار") + " ✓"), 'ok'); await refreshBusinesses(); after();
    } catch (e) { fail(e); } finally { file.value = ''; }
  };
  if (del) del.onclick = async () => {
    if (!await confirmBox(T("حذف الشعار"), ("<p>" + T("حذف شعار النشاط؟") + "</p>"), T("حذف"), true)) return;
    try { await bapi('/logo', { method: 'DELETE' }); toast(T("تم حذف الشعار"), 'ok'); await refreshBusinesses(); after(); } catch (e) { fail(e); }
  };
}

VIEWS.settings = async (el) => {
  await loadMeta();
  const b = S.meta.business;
  // visible items first, hidden ones dimmed underneath; each row: edit + hide/show
  const list = (key, rows, cols) => {
    const sorted = [...rows.filter(r => r.active), ...rows.filter(r => !r.active)];
    if (!sorted.length) return ("<p class=\"muted small\">" + T("لا يوجد — اضغط «إضافة»") + "</p>");
    return `<div class="tbl-wrap"><table><tbody>${sorted.map(r => `<tr class="${r.active ? '' : 'hidden-row'}">
      <td><b>${esc(T(r.name))}</b>${r.active ? '' : (" <span class=\"badge muted\">" + T("مخفي") + "</span>")}</td>${cols.map(c => `<td class="small muted">${c(r)}</td>`).join('')}
      <td class="row-acts"><button class="btn sm" data-edit="${key}:${r.id}">${icon('edit')}${T("تعديل")}</button>
        <button class="btn sm ${r.active ? '' : 'primary'}" data-toggle="${key}:${r.id}">${r.active ? icon('eyeOff') + T("إخفاء") : icon('eye') + T("إظهار")}</button></td></tr>`).join('')}</tbody></table></div>`;
  };
  el.innerHTML = `${pageHead('sliders', T("إعدادات النشاط"), esc(T(b.name)))}
  <section class="card"><h3>${T("شعار النشاط")}</h3><div id="logoBox" class="logo-box">
    <div class="logo-prev">${logoURL(b) ? `<img src="${logoURL(b)}" alt="${T("الشعار")}">` : ("<span class=\"muted small\">" + T("لا يوجد شعار") + "</span>")}</div>
    <div><p class="muted small" style="margin:0 0 10px">${T("يظهر الشعار في أعلى الشاشة، وفي صفحة الكاشير، وفي التقارير المطبوعة. صورة")} PNG ${T("أو")} JPG — ${T("يُصغَّر تلقائياً")}.</p>
      <div class="row"><label class="btn primary sm">${icon('image')}${logoURL(b) ? T("تغيير الشعار") : T("رفع شعار")}<input type="file" accept="image/png,image/jpeg,image/webp" hidden data-logo-file></label>
      ${logoURL(b) ? ("<button type=\"button\" class=\"btn sm danger\" data-logo-del>" + T("حذف الشعار") + "</button>") : ''}</div></div>
  </div></section>
  <section class="card"><h3>${T("الإعدادات العامة")}</h3><form id="fSet" class="fgrid">
    <label class="full">${T("اسم النشاط")}<input name="name" required maxlength="100" value="${esc(T(b.name))}"></label>
    <label>${T("نسبة رسوم البطاقة %")}<input name="card_fee_pct" type="number" step="0.01" min="0" value="${b.card_fee_pct}"></label>
    <label>${T("العهدة الثابتة في الدرج")}<input name="cash_float" type="number" step="0.01" min="0" value="${b.cash_float}"></label>
    ${b.opening_balance !== undefined ? `<label>${T("رصيد الشركة الافتتاحي")}<input name="opening_balance" type="number" step="0.01" value="${b.opening_balance}"></label>` : ''}
    <label>${T("وقت الافتتاح")}<input name="open_time" type="time" step="900" value="${b.open_time || ''}"></label>
    <label>${T("وقت الإغلاق")}<input name="close_time" type="time" step="900" value="${b.close_time || ''}"></label>
    <label class="check full"><input type="checkbox" name="cash_count" ${b.cash_count ? 'checked' : ''}> ${T("مطابقة النقد بعدّ الدرج (عجز / زيادة)")}</label>
    <p class="hint full" style="margin-top:-6px">${icon('info')}<span>${T("بدون المطابقة: إجمالي النقد = العهدة الثابتة + كاش مبيعات اليوم − ما دُفع كاش من الدرج، ولا تظهر خانة «النقد الموجود في الدرج» ولا عجز أو زيادة")}.</span></p>
    <label class="check full" id="ccWrap" ${b.cash_count ? '' : 'style="display:none"'}><input type="checkbox" name="cashier_counts" ${b.cashier_counts ? 'checked' : ''}> ${T("الكاشير يعدّ النقد في الدرج عند الإقفال (إن لم تُفعّلها: المحاسب أو المالك يستلم النقد ويسجّله من «سجل الإقفالات»)")}</label>
    <div style="align-self:end"><button class="btn primary">${T("حفظ")}</button></div></form>
    <p class="hint" id="dayHint"></p>
    <p class="hint">${T("الرصيد الافتتاحي")} = ${T("رصيد الشركة يوم بدء استخدام النظام (بدون الآجل لدى التطبيقات، فهو يُدخل لكل تطبيق على حدة)")}.</p></section>
  <section class="card" id="apps"><div class="card-head"><h3>${icon('truck')}${T("تطبيقات التوصيل")}</h3><button class="btn primary sm" data-add="apps">${icon('plus')}${T("إضافة تطبيق")}</button></div>
    <p class="muted small" style="margin:0 0 10px">${T("التطبيقات الظاهرة تظهر للكاشير في «إقفال اليوم». المخفي لا يظهر، لكن تبقى مبيعاته السابقة ومستحقاته محفوظة في التقارير")}.</p>
    ${list('apps', S.meta.apps, [r => r.opening_receivable ? (T("آجل افتتاحي") + " ") + money(r.opening_receivable) : ''])}</section>
  <div class="grid two">
    <section class="card"><div class="card-head"><h3>${icon('landmark')}${T("الدائنون")}</h3><button class="btn sm" data-add="creditors">${icon('plus')}${T("إضافة")}</button></div>
      ${S.meta.creditors.length ? list('creditors', S.meta.creditors, [r => (T("افتتاحي") + " ") + money(r.opening_balance)]) : ("<p class=\"muted small\">" + T("لا يوجد") + "</p>")}</section>
    <section class="card"><div class="card-head"><h3>${icon('cart')}${T("تصنيفات المشتريات")}</h3><button class="btn sm" data-add="categories:purchase">${icon('plus')}${T("إضافة")}</button></div>
      ${list('categories', S.meta.categories.filter(c => c.kind === 'purchase'), [])}</section>
    <section class="card"><div class="card-head"><h3>${icon('fileText')}${T("تصنيفات المصروفات")}</h3><button class="btn sm" data-add="categories:expense">${icon('plus')}${T("إضافة")}</button></div>
      ${list('categories', S.meta.categories.filter(c => c.kind === 'expense'), [])}</section>
  </div>`;
  const reload = () => VIEWS.settings(el);
  bindLogoBox($('#logoBox'), reload);
  // live explanation of where the work day ends, from the opening / closing times
  const fs_ = $('#fSet');
  const dayHint = () => {
    const o = fs_.open_time.value, c = fs_.close_time.value;
    $('#dayHint').innerHTML = o && c && o !== c
      ? `${icon('clock')}<span>${T("يوم العمل من")} <b>${timeLabel(o)}</b> ${T("إلى")} <b>${timeLabel(c)}</b>. ${T("دوام اليوم ينتهي الساعة")} <b>${minLabel(cutoffOf(o, c))}</b> ${T("وبعدها مباشرة يبدأ اليوم التالي. إذا تأخر الكاشير في الإقفال قليلاً يُحسب إقفاله على يومه")}.</span>`
      : `${icon('clock')}<span>${T("حدّد وقت الافتتاح ووقت الإغلاق ليحسب النظام يوم العمل بدقة في الإقفال والمشتريات والتقارير")}. ${T("حالياً يبدأ اليوم الجديد الساعة")} ${minLabel((b.day_start_hour || 0) * 60)}.</span>`;
  };
  fs_.addEventListener('input', dayHint); dayHint();
  $('#fSet').cash_count.onchange = (e) => { $('#ccWrap').style.display = e.target.checked ? '' : 'none'; };
  $('#fSet').onsubmit = (e) => { e.preventDefault(); busy(e.submitter, async () => { await bapi('/settings', { method: 'PUT', body: { ...formObj(e.target), cashier_counts: e.target.cashier_counts.checked ? 1 : 0, cash_count: e.target.cash_count.checked ? 1 : 0 } }); toast(T("تم الحفظ"), 'ok'); await refreshBusinesses(); reload(); }); };
  $$('[data-add]', el).forEach(btn => btn.onclick = () => {
    const [key, kind] = btn.dataset.add.split(':');
    listItemModal(key, null, reload, kind ? { kind } : {});
  });
  const find = (key, id) => ({ apps: S.meta.apps, categories: S.meta.categories, creditors: S.meta.creditors }[key]).find(x => x.id == id);
  $$('[data-edit]', el).forEach(btn => btn.onclick = () => {
    const [key, id] = btn.dataset.edit.split(':');
    listItemModal(key, find(key, id), reload);
  });
  $$('[data-toggle]', el).forEach(btn => btn.onclick = async () => {
    const [key, id] = btn.dataset.toggle.split(':');
    const item = find(key, id);
    if (item.active && !await confirmBox((T("إخفاء") + " ") + item.name, `<p>${T("سيختفي")} «${esc(T(item.name))}» ${T("من القوائم ومن صفحة الكاشير. البيانات السابقة تبقى محفوظة، ويمكنك إظهاره في أي وقت")}.</p>`, T("إخفاء"))) return;
    busy(btn, async () => {
      await bapi(`/${key}/${id}`, { method: 'PUT', body: { active: item.active ? 0 : 1 } });
      toast(item.active ? `${T("تم إخفاء")} «${item.name}»` : `${T("تم إظهار")} «${item.name}»`, 'ok'); reload();
    });
  });
  if (location.hash.includes('apps')) setTimeout(() => $('#apps')?.scrollIntoView({ behavior: 'smooth' }), 100);
};

// "16:30" → "4:30 م"
const timeLabel = (s) => { if (!s) return ''; let [h, m] = s.split(':').map(Number); const pm = h >= 12; h = h % 12 || 12; return `${h}:${String(m).padStart(2, '0')} ${pm ? T("م") : T("ص")}`; };
const minsOf = (s) => +s.slice(0, 2) * 60 + +s.slice(3, 5);
const cutoffOf = (o, c) => minsOf(c); // the new work day begins right at the closing time
const minLabel = (m) => timeLabel(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);

/* ═════════════════════════ admin ═════════════════════════ */
const PRESETS = {
  'كاشير': ['purchases_add', 'shift_manage'],
  'محاسب — عرض فقط': ['tx_view_all', 'reports_view', 'balance_view', 'audit_view', 'shift_view_expected'],
  'محاسب — عرض وتعديل': ['purchases_add', 'tx_view_all', 'tx_edit', 'shift_reopen', 'finance_manage', 'reports_view', 'balance_view', 'audit_view', 'shift_view_expected'],
  'مدير النشاط': null,
};
const FUND_PRESETS = { 'عضو': [], 'محصّل': ['fund_collect'], 'مشرف الصندوق': null };
const presetsFor = (kind) => kind === 'fund' ? FUND_PRESETS : PRESETS;
VIEWS.admin = async (el, [tab = 'users']) => {
  el.innerHTML = `<div class="page-head"><div class="ph-ic">${icon('users')}</div><div class="ph-t"><h1>${T("المستخدمون والأنشطة")}</h1></div>
    <div class="acts"><div class="seg" style="margin:0">${[['users', T("المستخدمون")], ['biz', T("الأنشطة")], ['audit', T("سجل العمليات")]].map(([k, l]) => `<label><input type="radio" name="at" value="${k}" ${tab === k ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>
    <a class="btn" href="/api/admin/backup" download title="${T("نسخة كاملة من كل البيانات — احفظها خارج السيرفر")}">${icon('download')}${T("تنزيل نسخة احتياطية")}</a></div></div><div id="adm"></div>`;
  $$('[name=at]', el).forEach(r => r.onchange = () => { location.hash = '#/admin/' + r.value; });
  const box = $('#adm');
  if (tab === 'biz') return adminBiz(box);
  if (tab === 'audit') return adminAudit(box);
  return adminUsers(box);
};
async function adminUsers(box) {
  const [users, bizs] = await Promise.all([api('/admin/users'), api('/admin/businesses')]);
  const bname = (id) => bizs.find(b => b.id === id)?.name || '';
  const bkind = (id) => bizs.find(b => b.id === id)?.kind;
  box.innerHTML = `<section class="card"><div class="card-head"><h3>${icon('users')}${T("المستخدمون")}</h3><button class="btn primary" id="bAdd">${icon('plus')}${T("مستخدم جديد")}</button></div>
    <div class="tbl-wrap"><table><thead><tr><th>${T("الاسم")}</th><th>${T("اسم الدخول")}</th><th>${T("الدور")}</th><th>${T("الأنشطة")}</th><th>${T("الحالة")}</th><th></th></tr></thead><tbody>
    ${users.map(u => `<tr><td>${esc(T(u.name))}</td><td class="num">${esc(u.username)}</td><td>${u.is_admin ? ("<span class=\"badge info\">" + T("مالك النظام") + "</span>") : [...new Set(u.access.map(a => roleName(false, a.permissions, bkind(a.business_id))))].join(' / ') || T("مستخدم")}</td>
      <td class="small">${u.is_admin ? T("كل الأنشطة") : u.access.map(a => `${esc(T(bname(a.business_id)))} <span class="muted">(${roleName(false, a.permissions, bkind(a.business_id))})</span>`).join('<br>') || '<span class="muted">—</span>'}</td>
      <td>${u.active ? ("<span class=\"badge pos\">" + T("فعّال") + "</span>") : ("<span class=\"badge muted\">" + T("موقوف") + "</span>")}</td><td><button class="btn sm" data-u="${u.id}">${T("تعديل")}</button></td></tr>`).join('')}
    </tbody></table></div></section>`;
  const reload = () => adminUsers(box);
  $('#bAdd').onclick = () => userModal(null, bizs, reload);
  $$('[data-u]', box).forEach(b => b.onclick = () => userModal(users.find(u => u.id == b.dataset.u), bizs, reload));
}
function userModal(u, bizs, after) {
  const P = S.me.permissions;
  const acc = (bid) => u?.access.find(a => a.business_id === bid);
  const m = modal(u ? T("تعديل مستخدم") : T("مستخدم جديد"), `<form id="fU">
    <div class="fgrid"><label>${T("الاسم")}<input name="name" required value="${esc(u?.name || '')}"></label>
    <label>${T("اسم الدخول")}<input name="username" required ${u ? 'readonly' : ''} value="${esc(u?.username || '')}" dir="ltr"></label>
    <label>${u ? T("كلمة مرور جديدة (اتركها فارغة للإبقاء)") : T("كلمة المرور")}<input name="password" type="text" ${u ? '' : 'required'} minlength="6" dir="ltr" autocomplete="off"></label></div>
    <h4 style="margin:16px 0 8px">${T("نوع الحساب")}</h4>
    <div class="role-pick">
      <label class="check role-opt"><input type="radio" name="role" value="biz" ${u?.is_admin ? '' : 'checked'}><span><b>${T("موظف أو مدير نشاط")}</b><small class="muted">${T("يرى فقط الأنشطة التي تختارها له، وبالصلاحيات التي تحددها. لمدير النشاط اضغط «مدير النشاط»")}</small></span></label>
      <label class="check role-opt"><input type="radio" name="role" value="owner" ${u?.is_admin ? 'checked' : ''}><span><b>${T("مالك النظام (صلاحية مطلقة)")}</b><small class="muted">${T("كل الأنشطة، وإنشاء المستخدمين والأنشطة، والنسخ الاحتياطي، والتصفير. اجعلها لك فقط")}</small></span></label>
    </div>
    <div class="row" style="margin:12px 0"><label class="check"><input type="checkbox" name="active" ${!u || u.active ? 'checked' : ''}> ${T("الحساب فعّال")}</label></div>
    <div id="permBox"><h4 style="margin:6px 0 10px">${T("الأنشطة والصلاحيات")}</h4>
    ${bizs.map(b => { const a = acc(b.id); return `<div class="perm-biz ${a ? '' : 'off'}" data-b="${b.id}">
      <div class="ph"><label class="check"><input type="checkbox" data-on ${a ? 'checked' : ''}> <b>${esc(T(b.name))}</b></label>
        ${b.kind === 'fund' ? `<span class="badge info">${T("صندوق عائلي")}</span>` : ''}<span class="row presets">${Object.keys(presetsFor(b.kind)).map(p => `<button type="button" class="btn sm" data-preset="${p}">${T(p)}</button>`).join('')}</span></div>
      <div class="pl">${Object.entries(P).filter(([k]) => permsFor(b.kind).includes(k)).map(([k, l]) => `<label class="check small"><input type="checkbox" data-p="${k}" ${a?.permissions.includes(k) ? 'checked' : ''}> ${l}</label>`).join('')}</div></div>`; }).join('')}</div>
    <div class="mf"><button class="btn primary">${T("حفظ")}</button></div></form>`, { wide: true });
  const f = $('#fU', m.el);
  const isOwner = () => f.querySelector('[name=role]:checked').value === 'owner';
  const syncAdmin = () => { $('#permBox', f).hidden = isOwner(); };
  $$('[name=role]', f).forEach(r => r.onchange = syncAdmin); syncAdmin();
  $$('[data-on]', f).forEach(c => c.onchange = () => c.closest('.perm-biz').classList.toggle('off', !c.checked));
  $$('[data-preset]', f).forEach(b => b.onclick = () => {
    const kind = bizs.find(x => x.id == b.closest('.perm-biz').dataset.b)?.kind;
    const ps = presetsFor(kind)[b.dataset.preset] || permsFor(kind);
    $$('[data-p]', b.closest('.perm-biz')).forEach(c => c.checked = ps.includes(c.dataset.p));
  });
  f.onsubmit = (e) => {
    e.preventDefault();
    if (isOwner() && !u?.is_admin && !confirm(T("تأكيد: هذا الحساب سيملك صلاحية مطلقة على كل النظام، مثل حسابك تماماً. متأكد؟"))) return;
    busy(e.submitter, async () => {
      const body = { name: f.name.value, username: f.username.value, password: f.password.value, is_admin: isOwner(), active: f.active.checked,
        access: $$('.perm-biz', f).filter(x => $('[data-on]', x).checked).map(x => ({ business_id: Number(x.dataset.b), permissions: $$('[data-p]:checked', x).map(c => c.dataset.p) })) };
      if (u) await api('/admin/users/' + u.id, { method: 'PUT', body }); else await api('/admin/users', { method: 'POST', body });
      m.close(); toast(T("تم الحفظ"), 'ok'); after();
    });
  };
}
// clear a business's trial numbers (transactions, closings) — a backup copy is taken first
function resetBusiness(b, after) {
  const m = modal(T("تصفير بيانات النشاط") + ' — ' + T(b.name), `<form autocomplete="off">
    <div class="alert warn">${icon('alert')}<div>${T("سيتم حذف كل الحركات والمشتريات والمصروفات والإقفالات والسدادات لهذا النشاط، ليبدأ من الصفر بالأرقام الصحيحة")}.<br>
      <b>${T("تبقى كما هي")}:</b> ${T("المستخدمون والصلاحيات، الشعار، المظهر، تطبيقات التوصيل، التصنيفات")}.</div></div>
    <label class="check"><input type="checkbox" name="zero_openings" checked> ${T("تصفير الأرصدة الافتتاحية (رصيد الشركة، آجل التطبيقات، ديون الدائنين)")}</label>
    <label class="check"><input type="checkbox" name="delete_creditors"> ${T("حذف الدائنين أيضاً")}</label>
    <label class="check"><input type="checkbox" name="clear_log"> ${T("مسح سجل التعديلات القديم لهذا النشاط")}</label>
    <p class="hint">${icon('info')}<span>${T("قبل الحذف تُحفظ نسخة احتياطية كاملة تلقائياً في مجلد data/backups — يمكن الرجوع إليها عند الحاجة")}.</span></p>
    <label style="margin-top:14px">${T("للتأكيد اكتب اسم النشاط")}: <b>${esc(b.name)}</b><input name="confirm" required></label>
    <div class="mf"><button class="btn danger">${icon('trash')}${T("تصفير نهائي")}</button><button type="button" class="btn" data-x>${T("إلغاء")}</button></div></form>`);
  const f = $('form', m.el);
  f.onsubmit = (e) => {
    e.preventDefault();
    busy(e.submitter, async () => {
      const r = await api('/admin/businesses/' + b.id + '/reset', { method: 'POST', body: { confirm: f.confirm.value, zero_openings: f.zero_openings.checked, delete_creditors: f.delete_creditors.checked, clear_log: f.clear_log.checked } });
      m.close();
      if (b.id === S.bid) await loadMeta();
      modal(T("تم التصفير"), `<div class="result"><div class="res-ic">${icon('check')}</div>
        <p>${T("تم حذف")} <b>${r.transactions}</b> ${T("حركة")} ${T("و")} <b>${r.shifts}</b> ${T("إقفال")}.</p>
        <p class="muted small">${T("النسخة الاحتياطية")}: <span class="num">${esc(r.backup)}</span></p></div>
        <p>${T("الخطوة التالية: أدخل الأرقام الصحيحة من «إعدادات النشاط» (رصيد الشركة الحالي، آجل كل تطبيق، ديون الدائنين)")}.</p>
        <div class="mf"><a class="btn primary" href="#/settings" data-x>${icon('sliders')}${T("إعدادات النشاط")}</a><button class="btn" data-x>${T("تم")}</button></div>`);
      after();
    });
  };
}

async function adminBiz(box) {
  const bizs = await api('/admin/businesses');
  box.innerHTML = `<section class="card"><div class="card-head"><h3>${icon('building')}${T("الأنشطة التجارية")}</h3><button class="btn primary" id="bAdd">${icon('plus')}${T("نشاط جديد")}</button></div>
    <p class="hint">${T("كل نشاط منفصل تماماً: له رصيده وشفتاته وحركاته وتطبيقاته ودائنوه الخاصة")}.</p>
    <div class="tbl-wrap"><table><thead><tr><th>${T("النشاط")}</th><th>${T("رسوم البطاقة")}</th><th>${T("العهدة")}</th><th>${T("الرصيد الافتتاحي")}</th><th>${T("الحالة")}</th><th></th></tr></thead><tbody>
    ${bizs.map(b => `<tr><td class="row" style="flex-wrap:nowrap">${logoImg(b, 't-logo')}<b>${esc(T(b.name))}</b>${b.kind === 'fund' ? `<span class="badge info">${T("صندوق عائلي")}</span>` : ''}</td>${b.kind === 'fund' ? '<td>—</td><td>—</td><td>—</td>' : `<td>${b.card_fee_pct}%</td><td class="n">${money(b.cash_float)}</td><td class="n">${money(b.opening_balance)}</td>`}
      <td>${b.active ? ("<span class=\"badge pos\">" + T("فعّال") + "</span>") : ("<span class=\"badge muted\">" + T("موقوف") + "</span>")}</td><td class="row-acts">${b.active ? `<button class="btn sm primary" data-go="${b.id}">${icon('store')}${T("اذهب للنشاط")}</button>` : ''}<button class="btn sm" data-b="${b.id}">${icon('edit')}${T("تعديل")}</button><button class="btn sm danger" data-reset="${b.id}">${icon('undo')}${T("تصفير البيانات")}</button></td></tr>`).join('')}
    </tbody></table></div></section>`;
  // open that business: switch to it and land on its settings page (fund → fund settings)
  $$('[data-go]', box).forEach(x => x.onclick = async () => {
    try {
      const b = bizs.find(y => y.id == x.dataset.go);
      S.bid = b.id; localStorage.setItem('bid', S.bid);
      await loadMeta(); renderShell();
      location.hash = b.kind === 'fund' ? '#/fsettings' : '#/settings';
      route();
    } catch (e) { fail(e); }
  });
  $$('[data-reset]', box).forEach(x => x.onclick = () => resetBusiness(bizs.find(b => b.id == x.dataset.reset), () => adminBiz(box)));
  const edit = (b) => {
    const m = modal(b ? T("تعديل نشاط") : T("نشاط جديد"), `<form>
      <label>${T("اسم النشاط")}<input name="name" required value="${esc(b?.name || '')}"></label>
      ${b ? '' : `<label style="margin-top:10px">${T("نوع النشاط")}<select name="kind"><option value="restaurant">${T("مطعم / نشاط تجاري (الإقفال اليومي)")}</option><option value="fund">${T("صندوق عائلي (اشتراكات شهرية وقروض)")}</option></select></label>`}
      <div class="fgrid" id="rFields" ${b?.kind === 'fund' ? 'hidden' : ''}><label>${T("رسوم البطاقة %")}<input name="card_fee_pct" type="number" step="0.01" min="0" value="${b?.card_fee_pct ?? 0.92}"></label>
      <label>${T("العهدة الثابتة")}<input name="cash_float" type="number" step="0.01" min="0" value="${b?.cash_float ?? 200}"></label>
      <label>${T("الرصيد الافتتاحي")}<input name="opening_balance" type="number" step="0.01" value="${b?.opening_balance ?? 0}"></label></div>
      ${b ? `<label class="check" style="margin-top:12px"><input type="checkbox" name="active" ${b.active ? 'checked' : ''}> ${T("النشاط فعّال")}</label>` : ("<p class=\"hint\">" + T("سيتم إنشاء تصنيفات وتطبيقات توصيل افتراضية يمكنك تعديلها لاحقاً") + ".</p>")}
      <div class="mf"><button class="btn primary">${T("حفظ")}</button></div></form>`);
    const kindSel = $('[name=kind]', m.el);
    if (kindSel) kindSel.onchange = () => { $('#rFields', m.el).hidden = kindSel.value === 'fund'; const h = $('.hint', m.el); if (h) h.textContent = kindSel.value === 'fund' ? T("سيتم إنشاء فئتي اشتراك: موظف 50 وغير موظف 10، ويمكنك تعديلهما من إعدادات الصندوق") + '.' : T("سيتم إنشاء تصنيفات وتطبيقات توصيل افتراضية يمكنك تعديلها لاحقاً") + '.'; };
    $('form', m.el).onsubmit = (e) => {
      e.preventDefault();
      busy(e.submitter, async () => {
        const body = formObj(e.target);
        let created = null;
        if (b) { body.active = e.target.active.checked; await api('/admin/businesses/' + b.id, { method: 'PUT', body }); }
        else created = await api('/admin/businesses', { method: 'POST', body });
        m.close(); toast(T("تم الحفظ"), 'ok');
        S.me = await api('/me');
        // a new business opens right away (its own menu and settings), instead of staying on the current one
        if (created && S.me.businesses.some(x => x.id === created.id)) {
          S.bid = created.id; localStorage.setItem('bid', S.bid); await loadMeta(); renderShell();
          location.hash = body.kind === 'fund' ? '#/fsettings' : '#/settings'; route();
          toast(T("تم إنشاء النشاط والانتقال إليه — يمكنك التبديل بين الأنشطة من القائمة أعلى الشريط الجانبي"), 'ok');
          return;
        }
        if (!S.bid && S.me.businesses[0]) { S.bid = S.me.businesses[0].id; await loadMeta(); }
        renderShell(); route();
      });
    };
  };
  $('#bAdd').onclick = () => edit(null);
  $$('[data-b]', box).forEach(x => x.onclick = () => edit(bizs.find(b => b.id == x.dataset.b)));
}
const AUDIT_L = { login: T("تسجيل دخول"), shift_open: T("فتح شفت"), shift_close: T("إقفال شفت"), shift_reopen: T("إعادة فتح شفت"), tx_create: T("إضافة حركة"), tx_update: T("تعديل حركة"), tx_delete: T("حذف حركة"),
  user_create: T("إضافة مستخدم"), user_update: T("تعديل مستخدم"), business_create: T("إضافة نشاط"), business_update: T("تعديل نشاط"), settings_update: T("تعديل الإعدادات") };
async function adminAudit(box) {
  const rows = await api('/admin/audit');
  box.innerHTML = `<section class="card"><h3>${T("آخر 300 عملية")}</h3><div class="tbl-wrap"><table><thead><tr><th>${T("الوقت")}</th><th>${T("المستخدم")}</th><th>${T("النشاط")}</th><th>${T("العملية")}</th><th>${T("تفاصيل")}</th></tr></thead><tbody>
    ${rows.map(r => { let x = null; try { x = JSON.parse(r.details || 'null'); } catch { }
      const body = x && (x.username || x.name) && !x.after && !x.before ? esc(x.username || x.name) : auditBody({ ...r, details: x });
      return `<tr><td class="small num">${r.created_at}</td><td>${esc(r.user_name || '')}</td><td class="small">${esc(r.business_name || '')}</td><td>${esc(AUDIT_ACTIONS[r.action]?.[0] || AUDIT_L[r.action] || r.action)}</td><td class="small">${body}</td></tr>`; }).join('')}
    </tbody></table></div></section>`;
}

boot();
