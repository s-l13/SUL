/* ═════════════════════════ family fund ═════════════════════════
   Pages of a business of kind 'fund': dashboard (supervisor / member), monthly collection, payments grid,
   members & family tree, loans, fund settings. Uses the helpers of app.js. */

(() => {
  // menu: the fund pages come first; restaurant pages are hidden on a fund business
  NAV_GROUPS.fund = T("الصندوق");
  NAV.unshift(
    ['fund', T("لوحة الصندوق"), () => isFund(), 'home', 'fund'],
    ['collect', T("التحصيل الشهري"), () => isFund() && can('fund_collect'), 'cash', 'fund'],
    ['flow', T("سجل الدفعات"), () => isFund() && (can('fund_view_all') || can('fund_manage')), 'list', 'fund'],
    ['members', T("شجرة العائلة"), () => isFund(), 'users', 'fund'],
    ['freport', T("تقرير الصندوق"), () => isFund(), 'chart', 'fund'],
    ['loanreq', T("طلب قرض"), () => isFund(), 'hand', 'fund'],
    ['loans', T("القروض"), () => isFund() && (can('fund_view_all') || can('fund_manage')), 'landmark', 'fund'],
  );
  NAV.splice(NAV.findIndex(n => n[0] === 'admin'), 0, ['fsettings', T("إعدادات الصندوق"), () => isFund() && can('fund_manage'), 'sliders', 'adm']);
})();

const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monName = (m) => (LANG === 'en' ? MONTHS_EN : MONTHS_AR)[Number(m.slice(5, 7)) - 1];
const monLabel = (m) => m ? `${monName(m)} ${m.slice(0, 4)}` : '';
const monShort = (m) => `${monName(m)} ${m.slice(2, 4)}`;
const nextMon = (m) => { let [y, mo] = m.split('-').map(Number); if (++mo > 12) { mo = 1; y++; } return `${y}-${String(mo).padStart(2, '0')}`; };
const prevMon = (m) => { let [y, mo] = m.split('-').map(Number); if (--mo < 1) { mo = 12; y--; } return `${y}-${String(mo).padStart(2, '0')}`; };
const pct = (v) => v === null || v === undefined ? '—' : `${v}%`;
const RATING = {
  excellent: [T("ممتاز"), 'pos', 'check'], good: [T("جيد"), 'info', 'check'], irregular: [T("متقطع"), 'warn', 'alert'],
  follow: [T("يحتاج متابعة"), 'neg', 'alert'], new: [T("جديد"), 'muted', 'clock'],
};
const ratingBadge = (r) => { const [l, c, ic] = RATING[r] || RATING.new; return `<span class="badge ${c}">${icon(ic)}${l}</span>`; };
const commitBar = (v) => v === null ? '<span class="muted small">—</span>'
  : `<div class="cbar"><div class="progress"><i style="width:${v}%;background:var(--${v >= 95 ? 'pos' : v >= 80 ? 'info' : v >= 60 ? 'warn' : 'neg'})"></i></div><b class="num">${v}%</b></div>`;
const fk = (label, value, ic, cls = '', sub = '') => `<div class="kpi ${cls}"><div class="k-ic">${icon(ic)}</div><div class="k-b"><div class="l">${label}</div><div class="v">${value}</div>${sub ? `<div class="small muted">${sub}</div>` : ''}</div></div>`;
const STATUS_L = { full: T("مدفوع"), ahead: T("مدفوع مقدّماً"), future: T("لم يحن بعد"), late: T("مدفوع متأخراً"), partial: T("جزئي"), missed: T("لم يُدفع"), open: T("الشهر الحالي"), none: T("لا يوجد استحقاق") };
// last months of a member as small coloured squares
const monthStrip = (months, n = 12) => `<div class="mstrip">${months.slice(-n).map(x => `<span class="ms ${x.status}" title="${monLabel(x.m)} — ${STATUS_L[x.status]}: ${money(x.covered ?? x.paid)} / ${money(x.due)}"><i></i><small>${monName(x.m).slice(0, 3)}</small></span>`).join('')}</div>`;
const mLegend = () => `<div class="legend small">${['full', 'ahead', 'late', 'partial', 'missed', 'open'].map(s => `<span><i class="ms-dot ${s}"></i>${STATUS_L[s]}</span>`).join('')}</div>`;

// cumulative growth of the fund (collected, balance) + monthly income bars
function growthChart(series) {
  if (!series.length) return `<p class="muted small center">${T("لا توجد بيانات بعد")}</p>`;
  const W = 640, H = 230, P = { l: 52, r: 34, t: 14, b: 34 };
  const max = Math.max(1, ...series.map(s => Math.max(s.collected, s.balance, s.income)));
  const x = (i) => P.l + (series.length === 1 ? (W - P.l - P.r) / 2 : i * (W - P.l - P.r) / (series.length - 1));
  const y = (v) => P.t + (H - P.t - P.b) * (1 - Math.max(0, v) / max);
  const line = (k) => series.map((s, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(s[k]).toFixed(1)}`).join(' ');
  const bw = Math.max(3, Math.min(18, (W - P.l - P.r) / series.length * 0.55));
  const step = Math.ceil(series.length / 8);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => max * f);
  return `<svg class="gchart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${T("النمو التراكمي للصندوق")}">
    ${ticks.map(t => `<line x1="${P.l}" x2="${W - P.r}" y1="${y(t)}" y2="${y(t)}" class="g-grid"/><text x="${P.l - 6}" y="${y(t) + 4}" class="g-ax" text-anchor="end">${Math.round(t).toLocaleString('en-US')}</text>`).join('')}
    ${series.map((s, i) => `<rect x="${x(i) - bw / 2}" y="${y(s.income)}" width="${bw}" height="${Math.max(0, H - P.b - y(s.income))}" class="g-bar"><title>${monLabel(s.m)}: ${money(s.income)}</title></rect>`).join('')}
    <path d="${line('collected')}" class="g-l1"/><path d="${line('balance')}" class="g-l2"/>
    ${series.map((s, i) => i % step === 0 || i === series.length - 1 ? `<text x="${x(i)}" y="${H - 12}" class="g-ax" text-anchor="middle">${monShort(s.m)}</text>` : '').join('')}
  </svg>
  <div class="legend small"><span><i style="background:var(--brand)"></i>${T("إجمالي التجميع (تراكمي)")}</span><span><i style="background:var(--warn)"></i>${T("الرصيد المتاح")}</span><span><i style="background:var(--surface-3)"></i>${T("الدخل الشهري")}</span></div>`;
}

/* ───────────── downloads (Excel opens these CSV files directly, Arabic included) ───────────── */
function downloadCSV(name, rows) {
  const cell = (v) => { const s = String(v ?? ''); return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const blob = new Blob(['﻿' + rows.map(r => r.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${name}-${S.me.today}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
// a member's own statement: month by month + every payment
function statementCSV(m) {
  downloadCSV('statement', [
    [T("كشف حساب"), m.name], [T("الاشتراك الشهري"), m.monthly], [T("إجمالي المساهمة"), m.total_paid], [T("المتأخرات"), m.arrears], [T("نسبة الالتزام"), pct(m.commitment)], [],
    [T("الشهر"), T("المطلوب"), T("المدفوع"), T("الحالة")], ...m.months.map(x => [x.m, x.due, x.covered ?? x.paid, STATUS_L[x.status]]),
    ...(m.payments ? [[], [T("الدفعات")], [T("الشهر"), T("النوع"), T("المبلغ"), T("التاريخ")], ...m.payments.map(p => [p.month, p.kind === 'dues' ? T("اشتراك") : T("قسط قرض"), p.amount, p.created_at.slice(0, 10)])] : []),
    ...((m.loans || []).length ? [[], [T("القروض")], [T("مبلغ القرض"), T("القسط"), T("المسدد"), T("المتبقي")], ...m.loans.map(l => [l.amount, l.installment, l.paid, l.remaining])] : []),
  ]);
}

/* ───────────── banners (rotating, on top of the fund page) ───────────── */
const BANNER_COLORS = { brand: T("لون النظام"), sunset: T("غروب"), ocean: T("محيط"), forest: T("أخضر"), rose: T("وردي"), gold: T("ذهبي"), night: T("ليلي") };
// size (small / medium / large), where the picture is centred, its zoom and how dark it is under the text
const banLayout = (b) => { let L = b.layout; if (typeof L === 'string') { try { L = JSON.parse(L); } catch { L = null; } }
  const n = (v, a, z, d) => { v = Number(v); return Number.isFinite(v) ? Math.min(z, Math.max(a, v)) : d; };
  L = L || {}; return { size: ['s', 'm', 'l'].includes(L.size) ? L.size : 'm', x: n(L.x, 0, 100, 50), y: n(L.y, 0, 100, 50), zoom: n(L.zoom, 100, 300, 100), shade: n(L.shade, 0, 90, 55) }; };
const slideHTML = (b, cls = '') => { const L = banLayout(b);
  return `<div class="fb-slide c-${esc(b.color || 'brand')} sz-${L.size} ${b.image ? 'has-img' : ''} ${cls}" style="--shade:${L.shade / 100}">
    ${b.image ? `<img class="fb-img" src="${esc(b.image)}" alt="" draggable="false" style="object-position:${L.x}% ${L.y}%;transform:scale(${L.zoom / 100});transform-origin:${L.x}% ${L.y}%">` : ''}
    <div class="fb-t">${b.title ? `<h2>${esc(b.title)}</h2>` : ''}${b.body ? `<p>${esc(b.body)}</p>` : ''}</div></div>`; };
function bannersHTML(list) {
  if (!list || !list.length) return '';
  return `<div class="fbanners" data-count="${list.length}">${list.map((b, i) => slideHTML(b, i ? '' : 'on')).join('')}
    ${list.length > 1 ? `<div class="fb-dots">${list.map((_, i) => `<button type="button" data-fb="${i}" class="${i ? '' : 'on'}" aria-label="${i + 1}"></button>`).join('')}</div>` : ''}</div>`;
}
function startBanners(el) {
  const box = $('.fbanners', el);
  clearInterval(startBanners.timer);
  if (!box || Number(box.dataset.count) < 2) return;
  let i = 0;
  const show = (n) => { i = n; $$('.fb-slide', box).forEach((s, k) => s.classList.toggle('on', k === i)); $$('[data-fb]', box).forEach((s, k) => s.classList.toggle('on', k === i)); };
  $$('[data-fb]', box).forEach(b => b.onclick = () => show(Number(b.dataset.fb)));
  startBanners.timer = setInterval(() => { if (!document.body.contains(box)) return clearInterval(startBanners.timer); show((i + 1) % Number(box.dataset.count)); }, 6000);
}
// pictures for banners: wide, compressed as JPEG so they stay small
function bannerImage(file) {
  return new Promise((resolve, reject) => {
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return reject(new Error(T("اختر صورة بصيغة") + ' PNG ' + T("أو") + ' JPG'));
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const k = Math.min(1, 1400 / img.width);
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(T("تعذّر قراءة الصورة"))); };
    img.src = url;
  });
}
async function bannersCard(box) {
  const list = await bapi('/fund/banners');
  box.innerHTML = `<div class="card-head"><h3>${icon('image')}${T("البانرات")}</h3><button class="btn sm primary" id="bBan">${icon('plus')}${T("إضافة بانر")}</button></div>
    <p class="muted small" style="margin:0 0 10px">${T("تظهر أعلى لوحة الصندوق لكل الأعضاء، وتتبدّل تلقائياً كل بضع ثوانٍ: ترحيب، تهنئة، تذكير بموعد الدفع…")}</p>
    ${list.length ? `<div class="ban-list">${list.map(b => `<div class="ban-item ${b.active ? '' : 'off'}">${slideHTML(b, 'on mini')}
      <div class="row">${b.active ? '' : `<span class="badge muted">${T("مخفي")}</span>`}<span class="grow"></span><button class="btn sm" data-bed="${b.id}">${icon('edit')}${T("تعديل")}</button></div></div>`).join('')}</div>`
      : `<p class="muted small">${T("لا توجد بانرات بعد")}</p>`}`;
  const form = (b) => {
    let image = b ? b.image : null;
    const L = banLayout(b || {});
    const md = modal(b ? T("تعديل بانر") : T("بانر جديد"), `<form autocomplete="off">
      <label>${T("العنوان")}<input name="title" maxlength="120" value="${esc(b?.title || '')}" placeholder="${T("مثال: أهلاً بكم في صندوق العائلة")}"></label>
      <label style="margin-top:10px">${T("النص")} <span class="opt">${T("(اختياري)")}</span><input name="body" maxlength="400" value="${esc(b?.body || '')}" placeholder="${T("مثال: موعد الدفع يوم 27 من كل شهر")}"></label>
      <div class="sec-title" style="margin-top:12px">${T("اللون")}</div>
      <div class="ban-colors">${Object.entries(BANNER_COLORS).map(([k, l]) => `<label class="bc"><input type="radio" name="color" value="${k}" ${(b?.color || 'brand') === k ? 'checked' : ''}><span class="fb-slide c-${k} on"></span><small>${l}</small></label>`).join('')}</div>
      <div class="sec-title" style="margin-top:12px">${T("حجم البانر")}</div>
      <div class="seg">${[['s', T("صغير")], ['m', T("متوسط")], ['l', T("كبير")]].map(([k, l]) => `<label><input type="radio" name="size" value="${k}" ${L.size === k ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>
      <div class="row" style="margin-top:12px"><label class="btn sm">${icon('image')}<span id="banImgL">${image ? T("تغيير الصورة") : T("صورة خلفية")}</span> <span class="opt">${T("(اختياري)")}</span><input type="file" accept="image/png,image/jpeg,image/webp" hidden id="banImg"></label>
        <button type="button" class="btn sm ghost" id="banNoImg" ${image ? '' : 'hidden'}>${T("بدون صورة")}</button></div>
      <div id="banPrev" style="margin-top:12px"></div>
      <div id="banCtl" class="ban-ctl" ${image ? '' : 'hidden'}>
        <p class="small muted" style="margin:0">${icon('info')} ${T("اسحب الصورة في المعاينة لتحريكها، واستخدم الشريط للتكبير")}</p>
        <label>${T("تكبير الصورة")}<input type="range" name="zoom" min="100" max="300" step="5" value="${L.zoom}"></label>
        <label>${T("تعتيم الصورة (لوضوح الكتابة)")}<input type="range" name="shade" min="0" max="90" step="5" value="${L.shade}"></label>
        <button type="button" class="btn sm ghost" id="banReset">${icon('undo')}${T("إعادة ضبط الصورة")}</button></div>
      <div class="row" style="margin-top:10px"><label class="check"><input type="checkbox" name="active" ${!b || b.active ? 'checked' : ''}> ${T("ظاهر")}</label>
        <label>${T("الترتيب")}<input name="sort" type="number" step="1" value="${b?.sort || 0}" style="width:80px"></label></div>
      <div class="mf">${b ? `<button type="button" class="btn danger" id="banDel">${icon('trash')}${T("حذف")}</button><span class="grow"></span>` : ''}<button class="btn primary">${T("حفظ")}</button></div></form>`);
    const f = $('form', md.el);
    let pos = { x: L.x, y: L.y };
    const layout = () => ({ size: f.size.value, x: Math.round(pos.x), y: Math.round(pos.y), zoom: Number(f.zoom.value), shade: Number(f.shade.value) });
    const prev = () => {
      const v = formObj(f);
      $('#banPrev', md.el).innerHTML = bannersHTML([{ title: v.title, body: v.body, color: v.color, image, layout: layout() }]) || '';
      $('#banNoImg', md.el).hidden = !image; $('#banCtl', md.el).hidden = !image;
      $('#banImgL', md.el).textContent = image ? T("تغيير الصورة") : T("صورة خلفية");
    };
    f.addEventListener('input', prev); f.addEventListener('change', prev); prev();
    // drag the picture inside the preview to choose what shows
    const pv = $('#banPrev', md.el);
    let drag = null;
    pv.addEventListener('pointerdown', (e) => { if (!image || !e.target.closest('.fb-slide')) return; const r = pv.getBoundingClientRect(); drag = { sx: e.clientX, sy: e.clientY, x: pos.x, y: pos.y, w: r.width, h: r.height }; pv.setPointerCapture(e.pointerId); e.preventDefault(); });
    pv.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const k = 100 / (Number(f.zoom.value) / 100);
      pos.x = Math.min(100, Math.max(0, drag.x - (e.clientX - drag.sx) / drag.w * k));
      pos.y = Math.min(100, Math.max(0, drag.y - (e.clientY - drag.sy) / drag.h * k));
      const img = $('.fb-img', pv); if (img) { img.style.objectPosition = `${pos.x}% ${pos.y}%`; img.style.transformOrigin = `${pos.x}% ${pos.y}%`; }
    });
    const end = () => { drag = null; }; pv.addEventListener('pointerup', end); pv.addEventListener('pointercancel', end);
    $('#banReset', md.el).onclick = () => { pos = { x: 50, y: 50 }; f.zoom.value = 100; f.shade.value = 55; prev(); };
    $('#banImg', md.el).onchange = async (e) => { const file = e.target.files[0]; e.target.value = ''; if (!file) return; try { image = await bannerImage(file); pos = { x: 50, y: 50 }; f.zoom.value = 100; prev(); } catch (err) { fail(err); } };
    $('#banNoImg', md.el).onclick = () => { image = null; prev(); };
    f.onsubmit = (e) => { e.preventDefault(); busy(e.submitter, async () => {
      const { size, zoom, shade, ...fo } = formObj(f);
      const body = { ...fo, active: f.active.checked, image, layout: layout() };
      if (b) await bapi('/fund/banners/' + b.id, { method: 'PUT', body }); else await bapi('/fund/banners', { method: 'POST', body });
      md.close(); toast(T("تم الحفظ"), 'ok'); bannersCard(box);
    }); };
    const del = $('#banDel', md.el);
    if (del) del.onclick = async () => { if (!await confirmBox(T("حذف البانر"), `<p>${T("حذف هذا البانر؟")}</p>`, T("حذف"), true)) return;
      try { await bapi('/fund/banners/' + b.id, { method: 'DELETE' }); md.close(); toast(T("تم الحذف"), 'ok'); bannersCard(box); } catch (err) { fail(err); } };
  };
  $('#bBan', box).onclick = () => form(null);
  $$('[data-bed]', box).forEach(x => x.onclick = () => form(list.find(b => b.id == x.dataset.bed)));
}

/* ───────────── contribution of each small family (a head + everyone under them) ───────────── */
function familiesTable(d) {
  const ms = d.members, up = (m) => m.spouse_id && ms.some(q => q.id === m.spouse_id) ? m.spouse_id : m.parent_id; // a wife is in her husband's family
  const kids = (id) => ms.filter(m => up(m) === id);
  const below = (m) => [m, ...kids(m.id).flatMap(below)];
  // the families = the children of each top person (the head may be "the X family" or a late grandfather)
  const tops = ms.filter(m => !up(m) || !ms.some(p => p.id === up(m)));
  const fams = tops.flatMap(t => !t.contributing && kids(t.id).length ? kids(t.id) : [t]).map(h => {
    const all = below(h), payers = all.filter(m => m.contributing);
    const due = all.reduce((a, m) => a + (m.due_closed || 0), 0), cov = all.reduce((a, m) => a + (m.covered_closed || 0), 0);
    return { head: h, count: payers.length, monthly: payers.filter(m => !m.left_month).reduce((a, m) => a + m.monthly, 0), total: all.reduce((a, m) => a + m.total_paid, 0), commitment: due ? Math.round(cov / due * 1000) / 10 : null };
  }).filter(f => f.count || f.total).sort((a, b) => b.total - a.total);
  if (fams.length < 2) return '';
  const all = fams.reduce((a, f) => a + f.total, 0) || 1;
  return `<section class="card"><div class="card-head"><h3>${icon('users')}${T("مساهمة العائلات")}</h3><span class="muted small">${T("كل ابن مع من تحته في الشجرة")}</span></div>
    <div class="tbl-wrap"><table><thead><tr><th>${T("العائلة / العضو")}</th><th>${T("المساهمون")}</th><th>${T("الشهري")}</th><th>${T("إجمالي المساهمة")}</th><th>${T("نسبة المشاركة")}</th><th>${T("الالتزام")}</th></tr></thead><tbody>
    ${fams.map(f => `<tr><td><b>${kids(f.head.id).length ? `${T("عائلة")} ${esc(f.head.name)}` : esc(f.head.name)}</b></td><td class="n">${f.count}</td><td class="n">${money(f.monthly)}</td><td class="n"><b>${money(f.total)}</b></td>
      <td style="min-width:120px"><div class="cbar"><div class="progress"><i style="width:${f.total / all * 100}%;background:var(--brand)"></i></div><b class="num">${Math.round(f.total / all * 1000) / 10}%</b></div></td><td>${commitBar(f.commitment)}</td></tr>`).join('')}
    </tbody></table></div></section>`;
}

/* ───────────── fund report (every account; names of others hidden unless shown by the supervisor) ───────────── */
const pName = (x) => x.name ? esc(x.name) : `<span class="masked">${T("عضو")} ${x.no}</span>`;
// a head with children = "family of …"; a person on their own = just their name (or member number)
const fName = (x) => !x.family ? pName(x) : x.name ? `${T("عائلة")} ${esc(x.name)}` : `<span class="masked">${T("عائلة")} ${x.no}</span>`;
VIEWS.freport = async (el) => {
  const manage = can('fund_manage');
  const [r, reqs] = await Promise.all([bapi('/fund/report'), manage ? bapi('/fund/report-requests') : Promise.resolve([])]);
  const t = r.totals, pv = r.privacy;
  const reload = () => VIEWS.freport(el);
  const privacyBar = {
    supervisor: '',
    everyone: `<div class="banner ok">${icon('eye')}<span class="grow">${T("الإدارة اختارت عرض أسماء الأعضاء والتزامهم للجميع، حرصاً على الشفافية")}.</span></div>`,
    grant: `<div class="banner ok">${icon('eye')}<span class="grow">${T("وافقت الإدارة على عرض التقرير لك بالأسماء حتى")} <b>${pv.until}</b>.</span></div>`,
    hidden: `<div class="banner info">${icon('eyeOff')}<span class="grow">${T("أسماء الأعضاء الآخرين مخفية حفاظاً على خصوصيتهم، وكل الأرقام والنسب ظاهرة. اسمك واسم أبنائك ظاهر لك")}.</span>
      ${pv.pending ? `<span class="badge warn">${icon('clock')}${T("طلبك قيد المراجعة")}</span>` : `<button class="btn sm" id="bAskNames">${icon('eye')}${T("طلب التقرير بالأسماء من الإدارة")}</button>`}</div>`,
  }[pv.by];
  const rt = r.ratings;
  const pendingNames = reqs.filter(x => x.status === 'pending');
  el.innerHTML = `${pageHead('chart', T("تقرير الصندوق"), `${esc(T(r.name))} · ${monLabel(r.now)}`, `<button class="btn" id="bRcsv">${icon('download')}${T("تنزيل Excel")}</button><button class="btn" onclick="print()">${icon('printer')}${T("طباعة")}</button>`)}
    ${privacyBar}
    ${manage ? `<section class="card no-print"><div class="card-head"><h3>${icon('eye')}${T("طلبات عرض التقرير بالأسماء")} <span class="badge ${pendingNames.length ? 'warn' : 'muted'}">${pendingNames.length}</span></h3><a class="btn sm" href="#/fsettings">${icon('sliders')}${T("إعدادات الشفافية")}</a></div>
      ${pendingNames.length ? pendingNames.map(x => `<div class="row req-line"><b class="grow">${esc(x.user_name)}</b><span class="muted small">${x.created_at.slice(0, 16)}</span>
        <label class="small">${T("لمدة")} <input type="number" min="1" max="365" value="30" style="width:70px" data-days="${x.id}"> ${T("يوم")}</label>
        <button class="btn sm primary" data-rapp="${x.id}">${icon('check')}${T("موافقة")}</button><button class="btn sm danger" data-rrej="${x.id}">${icon('x')}${T("رفض")}</button></div>`).join('')
      : `<p class="muted small">${T("لا توجد طلبات")}</p>`}
      ${reqs.some(x => x.status === 'approved' && x.expires_on >= S.me.today) ? `<div class="sec-title small">${T("يرون الأسماء حالياً")}</div>${reqs.filter(x => x.status === 'approved' && x.expires_on >= S.me.today).map(x => `<div class="row req-line"><span class="grow">${esc(x.user_name)}</span><span class="muted small">${T("حتى")} ${x.expires_on}</span><button class="btn sm" data-rrev="${x.id}">${T("إيقاف")}</button></div>`).join('')}` : ''}
    </section>` : ''}
    <div class="grid kpis fk">
      ${fk(T("إجمالي التجميع"), M(t.collected), 'coins')}${fk(T("الرصيد المتاح"), M(t.balance), 'wallet', 'accent')}
      ${fk(T("القروض الممنوحة"), M(t.loans_issued), 'landmark', '', `${t.loans_count} ${T("قرض")} · ${T("المتبقي")} ${money(t.loans_outstanding)}`)}${fk(T("معدل التحصيل"), pct(t.collection_rate), 'percent')}
    </div>
    <div class="stat-line">${[[T("المساهمون"), t.contributors], [T("ممتاز"), rt.excellent], [T("جيد"), rt.good], [T("متقطع"), rt.irregular], [T("يحتاج متابعة"), rt.follow], [T("الأشهر"), t.months]].map(([l, v]) => `<span>${l} <b>${v}</b></span>`).join('')}</div>
    <section class="card"><h3>${icon('users')}${T("مساهمة الأعضاء")}</h3>
      <div class="tbl-wrap"><table class="ftbl"><thead><tr><th>${T("العضو")}</th><th>${T("الشهري")}</th><th>${T("إجمالي المساهمة")}</th><th>${T("نسبة المشاركة")}</th><th>${T("الالتزام")}</th><th>${T("التقييم")}</th></tr></thead><tbody>
      ${r.members.map(m => `<tr class="${m.mine ? 'mine-row' : ''}"><td><b>${pName(m)}</b>${m.mine ? ` <span class="badge info">${T("أنت")}</span>` : ''}${m.left ? ` <span class="badge muted">${T("خرج")}</span>` : ''}</td>
        <td class="n">${money(m.monthly)}</td><td class="n"><b>${money(m.total_paid)}</b></td>
        <td style="min-width:120px"><div class="cbar"><div class="progress"><i style="width:${Math.min(100, m.share * 2)}%;background:var(--brand)"></i></div><b class="num">${m.share}%</b></div></td>
        <td>${commitBar(m.commitment)}</td><td>${ratingBadge(m.rating)}</td></tr>`).join('')}</tbody></table></div></section>
    ${r.families.length > 1 ? `<section class="card"><div class="card-head"><h3>${icon('users')}${T("مساهمة العائلات")}</h3><span class="muted small">${T("كل ابن مع من تحته في الشجرة")}</span></div>
      <div class="tbl-wrap"><table><thead><tr><th>${T("العائلة / العضو")}</th><th>${T("المساهمون")}</th><th>${T("إجمالي المساهمة")}</th><th>${T("نسبة المشاركة")}</th><th>${T("الالتزام")}</th></tr></thead><tbody>
      ${r.families.map(f => { const all = r.families.reduce((a, x) => a + x.total, 0) || 1; return `<tr class="${f.mine ? 'mine-row' : ''}"><td><b>${fName(f)}</b></td><td class="n">${f.count}</td><td class="n"><b>${money(f.total)}</b></td>
        <td style="min-width:120px"><div class="cbar"><div class="progress"><i style="width:${f.total / all * 100}%;background:var(--brand)"></i></div><b class="num">${Math.round(f.total / all * 1000) / 10}%</b></div></td><td>${commitBar(f.commitment)}</td></tr>`; }).join('')}</tbody></table></div></section>` : ''}
    <section class="card"><h3>${icon('clipboard')}${T("القروض")}</h3>
      ${r.loans.length ? `<div class="tbl-wrap"><table><thead><tr><th>${T("المستفيد")}</th><th>${T("الشهر")}</th><th>${T("مبلغ القرض")}</th><th>${T("المسدد")}</th><th>${T("المتبقي")}</th><th>${T("نسبة السداد")}</th></tr></thead><tbody>
      ${r.loans.map(l => `<tr class="${l.mine ? 'mine-row' : ''}"><td><b>${esc(l.name)}</b></td><td class="small">${monLabel(l.month)}</td><td class="n"><b>${money(l.amount)}</b></td><td class="n">${money(l.paid)}</td><td class="n">${money(l.remaining)}</td>
        <td style="min-width:110px"><div class="cbar"><div class="progress"><i style="width:${Math.min(100, l.paid_pct)}%"></i></div><b class="num">${l.paid_pct}%</b></div></td></tr>`).join('')}</tbody></table></div>` : `<p class="muted small">${T("لا توجد قروض بعد")}</p>`}</section>
    <section class="card"><h3>${icon('trendUp')}${T("نمو الصندوق")}</h3>${growthChart(r.series)}</section>`;
  const ask = $('#bAskNames');
  if (ask) ask.onclick = () => busy(ask, async () => { await bapi('/fund/report-requests', { method: 'POST' }); toast(T("تم إرسال طلبك للإدارة، وسيصلك تنبيه بالقرار"), 'ok'); reload(); });
  $$('[data-rapp]', el).forEach(b => b.onclick = () => busy(b, async () => { const days = $(`[data-days="${b.dataset.rapp}"]`, el).value; await bapi(`/fund/report-requests/${b.dataset.rapp}/approve`, { method: 'POST', body: { days } }); toast(T("تمت الموافقة"), 'ok'); reload(); }));
  $$('[data-rrej]', el).forEach(b => b.onclick = () => busy(b, async () => { await bapi(`/fund/report-requests/${b.dataset.rrej}/reject`, { method: 'POST' }); toast(T("تم رفض الطلب"), 'ok'); reload(); }));
  $$('[data-rrev]', el).forEach(b => b.onclick = () => busy(b, async () => { await bapi(`/fund/report-requests/${b.dataset.rrev}/revoke`, { method: 'POST' }); toast(T("تم الإيقاف"), 'ok'); reload(); }));
  const nm = (x) => x.name || `${T("عضو")} ${x.no}`;
  $('#bRcsv').onclick = () => downloadCSV('fund-report', [
    [T("تقرير الصندوق"), T(r.name), monLabel(r.now)], [T("إجمالي التجميع"), t.collected], [T("الرصيد المتاح"), t.balance], [T("القروض الممنوحة"), t.loans_issued], [T("المتبقي من القروض"), t.loans_outstanding], [T("معدل التحصيل"), pct(t.collection_rate)], [],
    [T("العضو"), T("الشهري"), T("إجمالي المساهمة"), T("نسبة المشاركة"), T("الالتزام"), T("التقييم")], ...r.members.map(m => [nm(m), m.monthly, m.total_paid, m.share + '%', pct(m.commitment), (RATING[m.rating] || RATING.new)[0]]), [],
    [T("المستفيد"), T("الشهر"), T("مبلغ القرض"), T("المسدد"), T("المتبقي")], ...r.loans.map(l => [l.name, l.month, l.amount, l.paid, l.remaining])]);
};

/* ───────────── dashboard ───────────── */
VIEWS.fund = async (el) => {
  const d = await bapi('/fund/overview');
  S.fund = d;
  const t = d.totals;
  const head = pageHead('home', esc(T(d.settings.name)), `${monLabel(d.now)} · ${t.months} ${T("شهر منذ البداية")}`,
    `${d.full ? `<button class="btn" id="bMcsv">${icon('download')}${T("تنزيل Excel")}</button>` : ''}<button class="btn" onclick="print()">${icon('printer')}${T("طباعة")}</button>`);
  // four numbers that matter, the rest as one quiet line
  const main = `<div class="grid kpis fk">
      ${fk(T("الرصيد المتاح"), M(t.balance), 'wallet', 'accent')}
      ${fk(T("إجمالي التجميع"), M(t.collected), 'coins')}
      ${fk(T("القروض القائمة"), M(t.loans_outstanding), 'landmark', t.loans_outstanding ? 'warn' : '', `${T("من")} ${money(t.loans_issued)} ${T("ممنوحة")}`)}
      ${fk(T("معدل التحصيل"), pct(t.collection_rate), 'percent')}
    </div>
    <div class="stat-line">${[[T("المساهمون"), t.contributors], [T("ممتاز"), t.excellent], [T("يحتاج متابعة"), t.follow], [T("المسدد من القروض"), money(t.installments)]].map(([l, v]) => `<span>${l} <b>${v}</b></span>`).join('')}</div>`;
  const chart = `<section class="card"><h3>${icon('trendUp')}${T("نمو الصندوق")}</h3>${growthChart(d.series)}</section>`;
  if (!d.full) {
    el.innerHTML = `${head}${bannersHTML(d.banners)}${myCards(d)}${main}${chart}`;
    bindMine(el); startBanners(el);
    return;
  }
  const unpaid = d.members.filter(m => m.contributing && m.this_month && m.this_month.remaining > 0.005 || m.arrears > 0.005);
  const active = d.members.filter(m => m.contributing || m.total_paid);
  el.innerHTML = `${head}
    ${bannersHTML(d.banners)}
    ${d.pending_requests && can('fund_manage') ? `<div class="banner info">${icon('hand')}<span class="grow">${T("يوجد")} <b>${d.pending_requests}</b> ${T("طلب قرض بانتظار قرارك")}</span><a class="btn sm" href="#/loans">${T("عرض الطلبات")}</a></div>` : ''}
    ${d.mine.length ? myCards(d) : ''}
    ${main}
    <div class="grid two">
      <section class="card"><div class="card-head"><h3>${icon('alert')}${T("لم يكتمل هذا الشهر")} <span class="badge ${unpaid.length ? 'warn' : 'pos'}">${unpaid.length}</span></h3>${unpaid.length && can('fund_collect') ? `<a class="btn sm" href="#/collect">${T("التحصيل")}</a>` : ''}</div>
        ${unpaid.length ? `<div class="mini-list">${unpaid.map(m => `<div class="r clickable" data-m="${m.id}"><span>${esc(m.name)}</span><b class="${m.arrears ? 'neg-t' : ''}">${money((m.this_month?.remaining || 0) + m.arrears)}</b></div>`).join('')}</div>`
          : `<p class="muted center">${T("الجميع دفع هذا الشهر ✓")}</p>`}</section>
      ${chart}
    </div>
    <section class="card"><div class="card-head"><h3>${icon('users')}${T("التزام الأعضاء")}</h3></div>
      <div class="tbl-wrap"><table class="ftbl"><thead><tr><th>${T("الاسم")}</th><th>${T("الشهري")}</th><th>${T("إجمالي المساهمة")}</th><th>${T("المتأخرات")}</th><th>${T("الالتزام")}</th><th>${T("التقييم")}</th></tr></thead><tbody>
      ${active.map(m => `<tr class="clickable" data-m="${m.id}"><td><b>${esc(m.name)}</b>${m.left_month ? ` <span class="badge muted">${T("خرج")}</span>` : ''}</td>
        <td class="n">${money(m.monthly)}</td><td class="n"><b>${money(m.total_paid)}</b> <span class="muted small">${m.share}%</span></td>
        <td class="n">${m.arrears ? `<b class="neg-t">${money(m.arrears)}</b>` : '<span class="muted">—</span>'}</td>
        <td>${commitBar(m.commitment)}</td><td>${ratingBadge(m.rating)}</td></tr>`).join('') || `<tr><td colspan="6" class="muted center">${T("لا يوجد أعضاء بعد — أضفهم من «شجرة العائلة»")}</td></tr>`}
      </tbody>${active.length ? `<tfoot><tr><td><b>${T("الإجمالي")}</b></td><td class="n">${money(active.filter(m => m.contributing && !m.left_month).reduce((a, m) => a + m.monthly, 0))}</td><td class="n"><b>${money(t.collected)}</b></td><td class="n">${money(active.reduce((a, m) => a + m.arrears, 0))}</td><td colspan="2"></td></tr></tfoot>` : ''}</table></div></section>
    ${familiesTable(d)}`;
  $$('[data-m]', el).forEach(r => r.onclick = () => memberDetail(Number(r.dataset.m)));
  bindMine(el); startBanners(el);
  $('#bMcsv').onclick = () => downloadCSV('members', [[T("الاسم"), T("الشهري"), T("إجمالي المساهمة"), T("نسبة المشاركة"), T("المتأخرات"), T("أشهر التعثر"), T("الالتزام"), T("التقييم")],
    ...active.map(m => [m.name, m.monthly, m.total_paid, m.share + '%', m.arrears, m.late_months, pct(m.commitment), (RATING[m.rating] || RATING.new)[0]])]);
};

// the logged-in member's own card(s): self + children they follow — with one summary of everyone's commitment first
function myCards(d) {
  const kids = d.mine.filter(m => m.relation === 'child');
  const summary = kids.length ? `<section class="card"><div class="card-head"><h3>${icon('users')}${T("التزامي والتزام أبنائي")}</h3></div>
    <div class="fam-list">${d.mine.map(m => { const tm = m.this_month, open = tm && tm.remaining > 0.005;
      return `<div class="fam-row clickable" data-mine="${m.id}">
        <div class="fr-h"><b>${esc(m.name)}</b>${m.relation === 'self' ? ` <span class="badge muted">${T("أنا")}</span>` : ''}<span class="grow"></span>${ratingBadge(m.rating)}</div>
        <div class="fr-b"><span class="fr-c">${T("الالتزام")} ${commitBar(m.commitment)}</span>
          ${!tm || !tm.due ? '' : open ? `<span class="badge warn">${T("هذا الشهر")}: ${T("المتبقي")} ${money(tm.remaining)}</span>` : `<span class="badge pos">${icon('check')}${T("هذا الشهر")}: ${T("مدفوع")}</span>`}
          ${m.arrears ? `<span class="badge neg">${T("المتأخرات")} ${money(m.arrears)}</span>` : ''}</div></div>`; }).join('')}</div></section>` : '';
  return summary + d.mine.map(m => {
    const tm = m.this_month;
    const unpaid = tm && tm.remaining > 0.005;
    return `<section class="card my-card">
      <div class="card-head"><h3>${icon(m.relation === 'self' ? 'key' : 'users')}${esc(m.name)} ${m.relation === 'child' ? `<span class="badge info">${T("من أبنائك")}</span>` : ''}</h3>${ratingBadge(m.rating)}</div>
      ${unpaid ? `<div class="banner warn">${icon('alert')}<span class="grow">${T("اشتراك هذا الشهر لم يكتمل بعد")} — ${T("المتبقي")} <b>${money(tm.remaining + m.arrears)}</b></span></div>` : tm && tm.due ? `<div class="banner ok">${icon('check')}<span class="grow">${T("اشتراك هذا الشهر مدفوع، شكراً لالتزامك")}</span></div>` : ''}
      <div class="grid kpis fk">
        ${fk(T("الاشتراك الشهري"), M(m.monthly), 'calendar')}
        ${fk(m.relation === 'child' ? T("إجمالي ما دفعه") : T("إجمالي ما دفعته"), M(m.total_paid), 'coins', 'pos', `${T("نسبة المشاركة")} ${m.share ?? 0}%`)}
        ${fk(T("المتأخرات"), M(m.arrears), 'alert', m.arrears ? 'neg' : '')}
        ${fk(T("نسبة الالتزام"), pct(m.commitment), 'percent', '', `${m.late_months} ${T("شهر متعثر")}`)}
      </div>
      <div class="sec-title">${icon('calendar')}<span class="grow">${T("آخر 12 شهراً")}</span>${mLegend()}</div>${monthStrip(m.months, 12)}
      ${m.loans.length ? `<div class="sec-title">${icon('landmark')}<span class="grow">${T("القروض")}</span></div>${m.loans.map(loanLine).join('')}` : ''}
      <p class="hint">${icon('info')}<span>${T("الحد المسموح للقرض")} = ${T("ضعف مساهماتك")}: <b>${money(m.loan_limit)}</b>${m.flagged ? ` — <b class="neg-t">${T("تنبيه: سجل السداد فيه تعثر، وقد يكون سبباً في رفض طلب القرض")}</b>` : ''}</span></p>
      <div class="row"><a class="btn sm" href="#/statement/${m.id}">${icon('fileText')}${T("الكشف الشهري")}</a><button class="btn sm" data-mine="${m.id}">${icon('list')}${T("كشف الحساب والدفعات")}</button>${m.relation !== 'child' || m.guardian_act ? `<a class="btn sm" href="#/loanreq">${icon('hand')}${T("طلب قرض")}</a>` : ''}</div>
    </section>`;
  }).join('');
}
function bindMine(el) { $$('[data-mine]', el).forEach(b => b.onclick = () => memberDetail(Number(b.dataset.mine))); }
const loanLine = (l) => `<div class="loan-line"><div class="grow"><b>${money(l.amount)}</b> <span class="muted small">· ${T("القسط")} ${money(l.installment)} · ${T("صُرف")} ${l.issued_date}</span>
  <div class="progress" style="margin-top:6px"><i style="width:${Math.min(100, l.paid_pct)}%"></i></div></div>
  <div class="small" style="text-align:end">${l.status === 'paid' ? `<span class="badge pos">${icon('check')}${T("تم السداد")}</span>` : `<span class="badge warn">${icon('clock')}${T("جارٍ السداد")}</span>`}
  <div>${T("المسدد")} ${money(l.paid)} · ${T("المتبقي")} <b>${money(l.remaining)}</b></div>${l.arrears ? `<div class="neg-t">${T("أقساط متأخرة")} ${money(l.arrears)}</div>` : ''}</div></div>`;

// one member: months, payments, loans, amount history
async function memberDetail(id) {
  const m = await bapi('/fund/members/' + id);
  const md = modal(m.name, `<div class="row no-print" style="justify-content:flex-end;margin-bottom:8px"><button class="btn sm" data-go="#/statement/${m.id}">${icon('fileText')}${T("الكشف الشهري")}</button><button class="btn sm" id="bStmt">${icon('download')}${T("تنزيل كشف الحساب")}</button></div>
    <div class="grid kpis fk">${fk(T("الاشتراك الشهري"), M(m.monthly), 'calendar')}${fk(T("إجمالي المساهمة"), M(m.total_paid), 'coins', 'pos', m.extra_paid ? `<span class="small muted">${T("منها إضافية")} ${money(m.extra_paid)}</span>` : '')}${fk(T("المتأخرات"), M(m.arrears), 'alert', m.arrears ? 'neg' : '')}${fk(T("الالتزام"), pct(m.commitment), 'percent', '', ratingBadge(m.rating))}</div>
    <div class="sec-title">${icon('calendar')}<span class="grow">${T("الأشهر")}</span>${mLegend()}</div>${monthStrip(m.months, 36)}
    ${m.flagged ? `<div class="banner warn">${icon('alert')}<span class="grow">${T("تعثّر")} ${m.max_run >= 3 ? `${m.max_run} ${T("أشهر متتالية")}` : `${m.late_months} ${T("أشهر متفرقة")}`}</span></div>` : ''}
    ${m.loans.length ? `<div class="sec-title">${icon('landmark')}<span class="grow">${T("القروض")}</span></div>${m.loans.map(loanLine).join('')}` : ''}
    <div class="sec-title">${icon('list')}<span class="grow">${T("الدفعات")}</span></div>
    ${m.payments.length ? `<div class="tbl-wrap"><table><thead><tr><th>${T("الشهر")}</th><th>${T("النوع")}</th><th>${T("المبلغ")}</th><th>${T("سجّلها")}</th><th>${T("الإيصال")}</th></tr></thead><tbody>
      ${m.payments.map(p => `<tr><td>${monLabel(p.month)}${p.for_month && p.for_month !== p.month ? `<div class="small muted">${T("عن")} ${monLabel(p.for_month)}</div>` : ''}</td><td>${p.kind !== 'dues' ? T("قسط قرض") : p.extra ? T("مساهمة إضافية") : T("اشتراك")}</td><td class="n"><b>${money(p.amount)}</b></td><td class="small muted">${esc(p.by)} · ${p.created_at.slice(0, 10)}</td>
        <td style="white-space:nowrap"><button class="btn sm ghost" data-go="#/receipt/${p.id}">${icon('receipt')}<span dir="ltr">R-${String(p.id).padStart(6, '0')}</span></button>${(can('fund_manage') || ((can('fund_collect')) && p.created_by === S.me.user.id)) ? `<button class="icon-btn" data-pedit="${p.id}" title="${T("تعديل")}">${icon('edit')}</button><button class="icon-btn danger" data-pdel="${p.id}" title="${T("حذف")}">${icon('trash')}</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : `<p class="muted small">${T("لا توجد دفعات")}</p>`}
    ${m.rates.length > 1 ? `<div class="sec-title">${icon('history')}<span class="grow">${T("تغيّر الاشتراك")}</span></div><p class="small">${m.rates.map(r => `${T("من")} ${monLabel(r.from_month)}: <b>${money(r.amount)}</b>`).join(' · ')}</p>` : ''}`, { wide: true });
  $('#bStmt', md.el).onclick = () => statementCSV(m);
  const again = () => { md.close(); memberDetail(id); if (location.hash.startsWith('#/flow')) { S.fund = null; route(); } };
  $$('[data-pedit]', md.el).forEach(b => b.onclick = () => paymentEdit(m.payments.find(p => p.id == b.dataset.pedit), m, again));
  $$('[data-pdel]', md.el).forEach(b => b.onclick = async () => {
    if (!await confirmBox(T("حذف الدفعة"), `<p>${T("حذف هذه الدفعة؟ ستظهر في سجل التعديلات")}.</p>`, T("حذف"), true)) return;
    try { await bapi('/fund/payments/' + b.dataset.pdel, { method: 'DELETE' }); toast(T("تم الحذف"), 'ok'); again(); } catch (err) { fail(err); }
  });
  $$('[data-go]', md.el).forEach(b => b.onclick = () => { md.close(); location.hash = b.dataset.go; });
  return md;
}

/* ───────────── monthly collection ───────────── */
VIEWS.collect = async (el, [month]) => {
  const d = await bapi('/fund/collect' + (month ? '?month=' + month : ''));
  const onlyOpen = VIEWS.collect.onlyOpen !== false;
  const q = VIEWS.collect.q || '';
  const rows = d.rows.filter(r => (!onlyOpen || !r.done) && (!q || r.name.includes(q) || r.parent.includes(q)));
  const go = (m) => { location.hash = '#/collect/' + m; };
  el.innerHTML = `${pageHead('cash', T("التحصيل الشهري"), T("سجّل ما دفعه كل عضو: الاشتراك الشهري، وقسط القرض إن وُجد"))}
    <section class="card"><div class="mnav">
      <button class="icon-btn" id="mPrev" ${d.month <= d.start ? 'disabled' : ''}>${icon('chevR')}</button>
      <b class="grow center">${monLabel(d.month)}${d.month === d.now ? ` <span class="badge info">${T("الشهر الحالي")}</span>` : ''}</b>
      <button class="icon-btn" id="mNext" ${d.month >= d.now ? 'disabled' : ''}>${icon('chevL')}</button></div>
      <div class="grid kpis fk" style="margin:12px 0 0">${fk(T("المطلوب هذا الشهر"), M(d.totals.required), 'sigma')}${fk(T("المحصّل"), M(d.totals.paid), 'check', 'pos')}${fk(T("لم يكتمل"), `${d.totals.open} ${T("عضو")}`, 'alert', d.totals.open ? 'warn' : '')}</div>
      <div class="row" style="margin-top:12px"><input id="cq" placeholder="${T("بحث بالاسم…")}" value="${esc(q)}" style="flex:1;min-width:140px">
        <label class="check"><input type="checkbox" id="cOpen" ${onlyOpen ? 'checked' : ''}> ${T("غير المكتمل فقط")}</label></div></section>
    <div id="cList">${rows.map(collectRow).join('') || `<div class="empty">${onlyOpen ? T("الجميع دفع هذا الشهر ✓") : T("لا يوجد أعضاء")}</div>`}</div>`;
  $('#mPrev').onclick = () => go(prevMon(d.month));
  $('#mNext').onclick = () => go(nextMon(d.month));
  $('#cOpen').onchange = (e) => { VIEWS.collect.onlyOpen = e.target.checked; VIEWS.collect(el, [d.month]); };
  $('#cq').onchange = (e) => { VIEWS.collect.q = e.target.value.trim(); VIEWS.collect(el, [d.month]); };
  const reload = () => VIEWS.collect(el, [d.month]);
  $$('form[data-pay]', el).forEach(f => {
    const [mid, kind, loan] = f.dataset.pay.split(':');
    // paid short: tick the months the member defaulted on — the money counts for the other months
    const box = $('.pay-months', f.parentElement);
    const picked = () => box ? $$('input:checked', box).map(i => i.value) : [];
    const drawMonths = () => {
      if (!box) return;
      const a = Number(f.amount.value) || 0;
      box.hidden = !(a > 0 && a < Number(f.dataset.left) - 0.005);
      const all = $$('input', box).map(i => i.value), late = picked(), pay = all.filter(m => !late.includes(m));
      $('.pm-note', box).innerHTML = box.hidden || !late.length ? '' : pay.length
        ? `${T("يُحسب المبلغ عن")}: <b>${pay.map(monLabel).join('، ')}</b> · <span class="neg-t">${T("متعثر في")}: ${late.map(monLabel).join('، ')}</span>`
        : `<span class="neg-t">${T("اترك شهراً واحداً على الأقل يُحسب عنه المبلغ")}</span>`;
    };
    // paid more than due: the rest as an extra contribution (more right to a loan) or paid ahead for the coming months
    const xb = $('.pay-extra', f.parentElement);
    const over = () => r2((Number(f.amount.value) || 0) - Number(f.dataset.left));
    const drawExtra = () => { if (!xb) return; const o = over(); xb.hidden = !(o > 0.005); $('.px-amt', xb).textContent = money(Math.max(0, o)); };
    f.addEventListener('input', drawExtra); drawExtra();
    f.addEventListener('input', drawMonths); if (box) box.addEventListener('change', drawMonths);
    $('[data-full]', f).onclick = () => { f.amount.value = f.dataset.left; f.amount.focus(); drawMonths(); };
    const cb = $('[data-cal]', f);
    if (cb) cb.onclick = () => { const row = d.rows.find(r => r.id === Number(mid)); monthsPicker(row, d.month, d.now, reload); };
    f.onsubmit = (e) => {
      e.preventDefault();
      const late = box && !box.hidden ? picked() : [];
      const months = late.length ? $$('input', box).map(i => i.value).filter(m => !late.includes(m)) : undefined;
      if (months && !months.length) return toast(T("اترك شهراً واحداً على الأقل يُحسب عنه المبلغ"), 'err');
      const extra = xb && !xb.hidden && ($('input[name^=px]:checked', xb) || {}).value === 'extra' ? over() : undefined;
      busy(e.submitter || $('button.primary', f), async () => {
        const r = await bapi('/fund/payments', { method: 'POST', body: { member_id: Number(mid), month: d.month, kind, loan_id: loan ? Number(loan) : undefined, amount: f.amount.value, months, extra } });
        toast(`${T("تم تسجيل")} ${money(f.amount.value)} ✓ — ${T("إيصال")} ${r.nos.join('، ')}`, 'ok'); reload();
      });
    };
  });
  $$('[data-delpay]', el).forEach(b => b.onclick = async () => {
    if (!await confirmBox(T("حذف الدفعة"), `<p>${T("حذف هذه الدفعة؟ ستظهر في سجل التعديلات")}.</p>`, T("حذف"), true)) return;
    try { await bapi('/fund/payments/' + b.dataset.delpay, { method: 'DELETE' }); toast(T("تم الحذف"), 'ok'); reload(); } catch (e) { fail(e); }
  });
};
// the month picker: tap the months paid, each with its amount (the monthly fee, can be changed) — one receipt per month
function monthsPicker(row, M, now, after) {
  const x = row.dues, cal = new Map((x.cal || []).map(c => [c.m, c]));
  const first = (x.cal || [])[0]?.m || M;
  // from the member's first month to now, then the next 12 months
  const months = []; for (let mo = first, i = 0; mo <= now && i < 600; mo = nextMon(mo), i++) months.push(mo);
  for (let mo = nextMon(now), i = 0; i < 12; mo = nextMon(mo), i++) months.push(mo);
  for (const c of x.cal || []) if (!months.includes(c.m)) months.push(c.m);
  months.sort();
  const info = (mo) => cal.get(mo) || { m: mo, due: x.monthly, left: x.monthly, status: mo > now ? 'future' : 'none' };
  const years = [...new Set(months.map(mo => mo.slice(0, 4)))];
  const md = modal(`${T("اختيار الأشهر")} — ${row.name}`, `<form autocomplete="off">
    <p class="muted small" style="margin-top:0">${T("اضغط على الأشهر التي دفعها، وعدّل مبلغ أي شهر إن لزم. كل شهر يُسجّل بإيصال مستقل")}.</p>
    ${years.map(y => `<div class="cal-y"><b>${y}</b><div class="cal-g">${months.filter(mo => mo.startsWith(y)).map(mo => { const c = info(mo), paid = c.left <= 0.005 && c.due > 0;
      return `<button type="button" class="cal-m ms-${c.status} ${paid ? 'paid' : ''}" data-mo="${mo}" ${paid ? 'disabled' : ''}><span>${monName(mo)}</span><small class="num">${paid ? '✓' : money(c.left || x.monthly).replace('.00', '')}</small></button>`; }).join('')}</div></div>`).join('')}
    <div id="calSel" class="cal-sel"></div>
    <div class="summary-box"><div class="r t"><span>${T("المجموع")}</span><b id="calTot" class="num">0.00</b></div></div>
    <div class="mf"><button class="btn primary" id="calOk" disabled>${icon('check')}${T("تسجيل")}</button><button type="button" class="btn" data-x>${T("إلغاء")}</button></div></form>`, { wide: true });
  const sel = new Map(); // month → amount
  const draw = () => {
    $$('[data-mo]', md.el).forEach(b => b.classList.toggle('on', sel.has(b.dataset.mo)));
    $('#calSel', md.el).innerHTML = [...sel.keys()].sort().map(mo => `<label class="cal-row"><span>${monLabel(mo)}${mo > now ? ` <span class="badge info">${T("مقدّم")}</span>` : ''}</span><input type="number" step="0.01" min="0.01" inputmode="decimal" data-amt="${mo}" value="${sel.get(mo)}"><button type="button" class="icon-btn" data-rm="${mo}" title="${T("إزالة")}">${icon('x')}</button></label>`).join('');
    const tot = r2([...sel.values()].reduce((a, v) => a + (Number(v) || 0), 0));
    $('#calTot', md.el).textContent = money(tot); $('#calOk', md.el).disabled = !sel.size || !(tot > 0);
    $$('[data-amt]', md.el).forEach(i => i.oninput = () => { sel.set(i.dataset.amt, i.value); const t = r2([...sel.values()].reduce((a, v) => a + (Number(v) || 0), 0)); $('#calTot', md.el).textContent = money(t); $('#calOk', md.el).disabled = !(t > 0); });
    $$('[data-rm]', md.el).forEach(b => b.onclick = () => { sel.delete(b.dataset.rm); draw(); });
  };
  $$('[data-mo]', md.el).forEach(b => b.onclick = () => { const mo = b.dataset.mo; if (sel.has(mo)) sel.delete(mo); else { const c = info(mo); sel.set(mo, r2(c.left > 0.005 ? c.left : x.monthly)); } draw(); });
  draw();
  $('form', md.el).onsubmit = (e) => { e.preventDefault(); busy($('#calOk', md.el), async () => {
    const parts = [...sel.entries()].map(([month, amount]) => ({ month, amount: r2(amount) })).filter(q => q.amount > 0);
    const r = await bapi('/fund/payments', { method: 'POST', body: { member_id: row.id, month: M, kind: 'dues', parts } });
    md.close(); toast(`${T("تم تسجيل")} ${parts.length} ${T("أشهر")} ✓ — ${T("إيصال")} ${r.nos.join('، ')}`, 'ok'); after();
  }); };
}
function payForm(mid, kind, loanId, label, x) {
  const left = Math.max(0, Math.round((x.required - x.paid) * 100) / 100);
  return `<div class="pay-line">
    <div class="pl-h"><b>${label}</b>
      <span class="small">${T("المطلوب")} <b class="num">${money(x.required)}</b>${x.arrears ? ` <span class="neg-t">(${T("منها متأخرات")} ${money(x.arrears)})</span>` : ''}${x.remaining !== undefined ? ` · <span class="muted">${T("المتبقي من القرض")} ${money(x.remaining)}</span>` : ''}</span>
      <span class="grow"></span>${x.paid >= x.required - 0.005 && x.required > 0 ? `<span class="badge pos">${icon('check')}${T("مكتمل")}</span>` : x.paid > 0 ? `<span class="badge warn">${T("جزئي")}</span>` : ''}${x.extra ? ` <span class="badge info">${T("مساهمة إضافية")} ${money(x.extra)}</span>` : ''}</div>
    ${x.payments.length ? `<div class="chips">${x.payments.map(p => `<span class="chip pay"><a href="#/receipt/${p.id}" title="${T("الإيصال")}">${icon('receipt')}</a>${money(p.amount)}${p.extra ? ` <small>${T("إضافية")}</small>` : ''}${p.for_month && p.for_month !== p.month ? ` <small class="muted">${T("عن")} ${monLabel(p.for_month)}</small>` : ''}${can('fund_manage') || p.created_by === S.me.user.id ? `<button type="button" data-delpay="${p.id}" title="${T("حذف")}">${icon('x')}</button>` : ''}</span>`).join('')}</div>` : ''}
    <form class="pay-f" data-pay="${mid}:${kind}:${loanId || ''}" data-left="${left}" autocomplete="off">
      <input name="amount" type="number" step="0.01" min="0.01" inputmode="decimal" placeholder="${T("المبلغ المدفوع")}" required>
      <button type="button" class="btn sm" data-full ${left ? '' : 'disabled'}>${T("كامل")} ${left ? money(left) : ''}</button>
      ${kind === 'dues' ? `<button type="button" class="btn sm" data-cal title="${T("اختيار الأشهر من التقويم")}">${icon('calendar')}${T("الأشهر")}</button>` : ''}
      <button class="btn sm primary">${icon('check')}${T("تسجيل")}</button>
      ${kind === 'dues' ? `<div class="pay-extra" hidden><div class="small"><b>${T("المبلغ أكبر من المطلوب بـ")} <span class="px-amt num"></span></b> — ${T("ماذا نفعل بالزيادة؟")}</div>
        <label class="check"><input type="radio" name="px${mid}" value="extra" checked> ${T("مساهمة إضافية")}</label>
        <div class="muted small" style="margin:-4px 0 2px;padding-inline-start:26px">${T("(تزيد مساهماته وأحقيته في القرض، ويبقى عليه اشتراك الشهور القادمة)")}</div>
        <label class="check"><input type="radio" name="px${mid}" value="ahead"> ${T("دفعة مقدّمة للشهور القادمة")}</label></div>` : ''}</form>
    ${kind === 'dues' && (x.open_months || []).length > 1 ? `<div class="pay-months" hidden>
      <div class="small"><b>${T("المبلغ أقل من المطلوب — حدّد الشهور التي تعثّر فيها")}</b> <span class="muted">${T("(اختياري — بدون تحديد يُحسب للأشهر الأقدم أولاً)")}</span></div>
      <div class="chips">${x.open_months.map(o => `<label class="chip mchk"><input type="checkbox" value="${o.m}"> ${monLabel(o.m)} <span class="muted num">${money(o.left)}</span></label>`).join('')}</div>
      <div class="small pm-note"></div></div>` : ''}</div>`;
}
const collectRow = (r) => `<section class="card c-row ${r.done ? 'done' : ''}">
  <div class="card-head"><h3>${esc(r.name)}${r.parent ? ` <span class="muted small">${T("ابن/ة")} ${esc(r.parent)}</span>` : ''}</h3>${r.done ? `<span class="badge pos">${icon('check')}${T("مكتمل")}</span>` : ''}</div>
  ${payForm(r.id, 'dues', null, T("الاشتراك الشهري"), r.dues)}
  ${r.loans.map(l => payForm(r.id, 'installment', l.id, `${T("قسط القرض")} (${money(l.amount)})`, l)).join('')}</section>`;

/* ───────────── payments grid (members × months) ───────────── */
VIEWS.flow = async (el, [year]) => {
  const d = S.fund && S.fund.full && year ? S.fund : await bapi('/fund/overview');
  S.fund = d;
  // the coming months: to the end of this year, and further when someone already paid that far
  const ahead = new Set(); for (let mo = nextMon(d.now); mo.slice(0, 4) === d.now.slice(0, 4); mo = nextMon(mo)) ahead.add(mo);
  for (const m of d.members) for (const x of m.months) if (x.m > d.now) ahead.add(x.m);
  const allMonths = [...d.series, ...[...ahead].sort().map(m => ({ m, income: 0, collected: null, future: true }))];
  const years = [...new Set(allMonths.map(s => s.m.slice(0, 4)))];
  const y = years.includes(year) ? year : d.now.slice(0, 4);
  const months = allMonths.filter(s => s.m.startsWith(y));
  const members = d.members.filter(m => m.contributing || m.total_paid);
  const edit = can('fund_collect') || can('fund_manage');
  el.innerHTML = `${pageHead('list', T("سجل الدفعات"), T("تدفق الأموال الشهري لكل عضو") + (edit ? ' — ' + T("اضغط على أي شهر لتسجيل مبلغه أو تعديله") : ''), `<div class="seg" style="margin:0">${years.map(v => `<label><input type="radio" name="fy" value="${v}" ${v === y ? 'checked' : ''}><span>${v}</span></label>`).join('')}</div>
    <button class="btn" id="bFcsv">${icon('download')}${T("تنزيل Excel")}</button><button class="btn" onclick="print()">${icon('printer')}${T("طباعة")}</button>`)}
    <section class="card">${mLegend()}<div class="tbl-wrap"><table class="flow"><thead><tr><th>${T("الاسم")}</th><th>${T("الشهري")}</th>${months.map(s => `<th>${monName(s.m)}</th>`).join('')}<th>${T("المجموع")}</th></tr></thead><tbody>
    ${members.map(m => {
      // each month shows what covers it (even when paid in a later month); extra contributions are added with +
      const by = new Map(m.months.map(x => [x.m, x]));
      const cell = (x) => (x.covered ? money(x.covered).replace('.00', '') : '-') + (x.extra ? ` <small class="fx">+${money(x.extra).replace('.00', '')}</small>` : '');
      const tip = (x) => `${STATUS_L[x.status]}: ${money(x.covered)} / ${money(x.due)}${x.paid ? ` — ${T("المستلم في هذا الشهر")} ${money(x.paid)}` : ''}`;
      // this year's total also tells what is already paid for the years after it
      const later = y === d.now.slice(0, 4) ? r2(m.months.filter(x => x.m.slice(0, 4) > y).reduce((a, x) => a + x.covered, 0) + (m.credit || 0)) : 0;
      const credit = later > 0.005 ? `<div class="small muted">+ ${T("مقدّم لما بعد هذه السنة")} ${money(later)}</div>` : '';
      const fut = (mo) => m.contributing && !m.left_month && (!m.join_month || m.join_month <= mo) ? { m: mo, due: m.monthly, covered: 0, paid: 0, extra: 0, status: 'future' } : null;
      return `<tr><td><b>${esc(m.name)}</b></td><td class="n muted">${money(m.monthly)}</td>${months.map(s => { const x = by.get(s.m) || (s.future ? fut(s.m) : null); return x ? `<td class="fc ${x.status} ${edit ? 'ed' : ''}" title="${tip(x)}" ${edit ? `data-cell="${m.id}:${x.m}"` : ''}>${cell(x)}</td>` : '<td class="fc none"></td>'; }).join('')}
        <td class="n"><b>${money(months.reduce((a, s) => a + (by.get(s.m)?.covered || 0) + (by.get(s.m)?.extra || 0), 0) + later)}</b>${credit}</td></tr>`;
    }).join('')}
    </tbody><tfoot>
      <tr><td colspan="2"><b>${T("المحصّل فعلياً في الشهر")}</b></td>${months.map(s => `<td class="n">${s.future ? '' : `<b>${money(s.income).replace('.00', '')}</b>`}</td>`).join('')}<td class="n"><b>${money(months.reduce((a, s) => a + s.income, 0))}</b></td></tr>
      <tr><td colspan="2">${T("المجموع التراكمي")}</td>${months.map(s => `<td class="n muted">${s.future ? '' : money(s.collected).replace('.00', '')}</td>`).join('')}<td></td></tr>
    </tfoot></table></div></section>`;
  $$('[name=fy]', el).forEach(r => r.onchange = () => { location.hash = '#/flow/' + r.value; });
  $$('[data-cell]', el).forEach(td => td.onclick = () => { const [mid, mo] = td.dataset.cell.split(':'); monthCell(Number(mid), mo, async () => { S.fund = null; await VIEWS.flow(el, [y]); }).catch(fail); });
  $('#bFcsv').onclick = () => downloadCSV('payments-' + y, [[T("الاسم"), T("الشهري"), ...months.map(x => x.m), T("المجموع")],
    ...members.map(m => { const by = new Map(m.months.map(x => [x.m, x])); const v = (x) => (by.get(x.m)?.covered || 0) + (by.get(x.m)?.extra || 0); return [m.name, m.monthly, ...months.map(v), months.reduce((a, x) => a + v(x), 0) + (y === d.now.slice(0, 4) ? m.credit || 0 : 0)]; }),
    [T("المحصّل فعلياً في الشهر"), '', ...months.map(x => x.income), months.reduce((a, x) => a + x.income, 0)]]);
};

// one member × one month: what covers it, the money recorded in that month (delete a wrong one), and add an amount for it
async function monthCell(mid, mo, after) {
  const m = await bapi('/fund/members/' + mid);
  const now = (S.fund && S.fund.now) || S.me.today.slice(0, 7);
  const x = m.months.find(q => q.m === mo) || (mo > now ? { m: mo, due: m.monthly, covered: 0, paid: 0, extra: 0, status: 'future' } : null);
  if (!x) return;
  const pays = m.payments.filter(p => p.kind === 'dues' && p.month === mo);
  const others = m.payments.filter(p => p.kind === 'dues' && p.month !== mo);
  // what is typed straight in: the dues tied to this month, and the extra contribution recorded in it
  const tiedSum = r2(m.payments.filter(p => p.kind === 'dues' && !p.extra && p.for_month === mo).reduce((t, p) => t + p.amount, 0));
  const extraSum = r2(pays.filter(p => p.extra).reduce((t, p) => t + p.amount, 0));
  const lumps = m.payments.filter(p => p.kind === 'dues' && !p.extra && !p.for_month);
  const fromOther = x.covered - tiedSum > 0.005; // part of this month is paid by an amount recorded in one go
  const mayEdit = (p) => can('fund_manage') || p.created_by === S.me.user.id;
  const payChip = (p) => `<span class="chip pay"><a href="#/receipt/${p.id}" title="${T("الإيصال")}">${icon('receipt')}</a>${money(p.amount)} <small>${payKind(p)}</small>${p.month !== mo ? ` <small class="muted">· ${T("سُجّلت في")} ${monLabel(p.month)}</small>` : ''}${mayEdit(p) ? `<button type="button" data-edp="${p.id}" title="${T("تعديل")}">${icon('edit')}</button><button type="button" data-delp="${p.id}" title="${T("حذف")}">${icon('x')}</button>` : ''}</span>`;
  const md = modal(`${m.name} — ${monLabel(mo)}`, `<div class="summary-box">
      <div class="r"><span>${T("المستحق لهذا الشهر")}</span><b>${money(x.due)}</b></div>
      <div class="r"><span>${T("الحالة")}</span><span class="badge ${['missed'].includes(x.status) ? 'neg' : ['partial', 'future'].includes(x.status) ? 'warn' : 'pos'}">${STATUS_L[x.status]}</span></div></div>
    ${fromOther && lumps.length ? `<div class="banner info" style="margin:10px 0">${icon('calendar')}<span class="grow">${T("جزء من هذا الشهر مدفوع من مبالغ سُجّلت مجمّعة")} (${lumps.length}). ${T("قسّمها ليصبح لكل شهر رقمه الخاص الذي تعدّله هنا")}</span><button type="button" class="btn sm" id="mSplit">${T("تقسيم الكل")}</button></div>` : ''}
    <form autocomplete="off" class="m-set">
      <div class="fgrid">
        <label>${T("الاشتراك المدفوع لهذا الشهر")}<input name="dues" type="number" step="0.01" min="0" inputmode="decimal" value="${tiedSum || ''}" placeholder="0"></label>
        <label>${T("مساهمة إضافية في هذا الشهر")}<input name="extra" type="number" step="0.01" min="0" inputmode="decimal" value="${extraSum || ''}" placeholder="0" ${mo > now ? 'disabled' : ''}></label>
      </div>
      <div class="row small" style="margin:6px 0 0;gap:6px"><button type="button" class="btn sm ghost" data-fill="${x.due}">${T("المستحق")} ${money(x.due)}</button><button type="button" class="btn sm ghost" data-fill="0">${T("لم يدفع")} (0)</button></div>
      <p class="muted small" id="mNote" style="margin:6px 0 0"></p>
      <div class="mf"><button class="btn primary">${icon('check')}${T("حفظ")}</button><button type="button" class="btn" data-x>${T("إغلاق")}</button></div></form>
    <div class="sec-title">${T("المبالغ المسجّلة في هذا الشهر")}</div>
    ${pays.length ? `<div class="chips">${pays.map(payChip).join('')}</div>` : `<p class="muted small">${T("لا يوجد")}</p>`}
    ${others.length ? `<details class="pm-others"><summary>${T("دفعات العضو في الأشهر الأخرى")} (${others.length})</summary><div class="chips" style="margin-top:8px">${others.map(payChip).join('')}</div></details>` : ''}`);
  const f = $('form.m-set', md.el);
  const note = () => { const v = Number(f.dues.value) || 0;
    $('#mNote', md.el).textContent = v > x.due + 0.005 ? `${T("الزيادة عن المستحق")} (${money(r2(v - x.due))}) ${T("تُحسب للأشهر غير المدفوعة أو القادمة")}` : ''; };
  f.oninput = note; note();
  $$('[data-fill]', f).forEach(b => b.onclick = () => { f.dues.value = b.dataset.fill === '0' ? '0' : b.dataset.fill; note(); f.dues.focus(); });
  f.onsubmit = (e) => { e.preventDefault(); busy(e.submitter, async () => {
    // a coming month paid today: recorded as received now, for that month
    const body = { dues: f.dues.value === '' ? 0 : f.dues.value };
    if (!f.extra.disabled) body.extra = f.extra.value === '' ? 0 : f.extra.value;
    await bapi(`/fund/members/${mid}/month/${mo}`, { method: 'PUT', body });
    md.close(); toast(`${T("تم حفظ")} ${monLabel(mo)} ✓`, 'ok'); after();
  }); };
  const sp = $('#mSplit', md.el);
  if (sp) sp.onclick = () => busy(sp, async () => {
    const r = await bapi(`/fund/members/${mid}/split-all`, { method: 'POST' });
    toast(`${T("تم التقسيم")}: ${r.payments} ${T("دفعات")} ✓`, 'ok'); md.close(); await after(); monthCell(mid, mo, after);
  });
  $$('[data-delp]', md.el).forEach(b => b.onclick = async () => {
    if (!await confirmBox(T("حذف الدفعة"), `<p>${T("حذف هذه الدفعة؟ ستظهر في سجل التعديلات")}.</p>`, T("حذف"), true)) return;
    try { await bapi('/fund/payments/' + b.dataset.delp, { method: 'DELETE' }); md.close(); toast(T("تم الحذف"), 'ok'); after(); } catch (err) { fail(err); }
  });
  $$('[data-edp]', md.el).forEach(b => b.onclick = () => paymentEdit(m.payments.find(p => p.id == b.dataset.edp), m, () => { md.close(); after(); }, mo));
}
const payKind = (p) => p.kind !== 'dues' ? T("قسط قرض") : p.extra ? T("مساهمة إضافية") : p.for_month ? `${T("عن")} ${monLabel(p.for_month)}` : T("اشتراك");
// correct a recorded payment: amount, and what it counts for
// ctx = the month whose cell the edit was opened from: the month list starts there
function paymentEdit(p, m, after, ctx) {
  const dues = p.kind === 'dues';
  const mode = p.extra ? 'extra' : p.for_month ? 'month' : 'auto';
  const pick = ctx || p.for_month || p.month;
  const nowM = (S.fund && S.fund.now) || S.me.today.slice(0, 7);
  const set = new Set((m.months || []).map(x => x.m)); for (let mo = nowM, i = 0; i < 24; i++) { mo = nextMon(mo); set.add(mo); }
  const months = [...set].sort().reverse();
  const md = modal(`${T("تعديل دفعة")} — ${m.name}`, `<form autocomplete="off">
    <div class="summary-box"><div class="r"><span>${T("سُجّلت في")}</span><b>${monLabel(p.month)}</b></div><div class="r"><span>${T("الإيصال")}</span><span dir="ltr">R-${String(p.id).padStart(6, '0')}</span></div>
      ${ctx ? `<div class="r t"><span>${T("تعدّل من خانة شهر")}</span><b>${monLabel(ctx)}</b></div>` : ''}</div>
    <label>${T("المبلغ")}<input name="amount" type="number" step="0.01" min="0.01" inputmode="decimal" required value="${p.amount}"></label>
    ${dues ? `<div class="sec-title" style="margin-top:12px">${T("تُحسب هذه الدفعة")}</div>
      <label class="check"><input type="radio" name="mode" value="auto" ${mode === 'auto' ? 'checked' : ''}> ${T("اشتراك — للأشهر الأقدم غير المدفوعة أولاً")}</label>
      <label class="check"><input type="radio" name="mode" value="month" ${mode === 'month' ? 'checked' : ''}> ${T("اشتراك شهر محدد")}</label>
      <select name="for_month" style="margin:4px 0 8px">${months.map(x => `<option value="${x}" ${x === pick ? 'selected' : ''}>${monLabel(x)}</option>`).join('')}</select>
      <label class="check"><input type="radio" name="mode" value="extra" ${mode === 'extra' ? 'checked' : ''}> ${T("مساهمة إضافية (لا تغطي أي شهر)")}</label>` : ''}
    <label style="margin-top:10px">${T("ملاحظة")} <span class="opt">${T("(اختياري)")}</span><input name="note" maxlength="300" value="${esc(p.note || '')}"></label>
    <p class="hint">${icon('info')}<span>${T("يُسجّل التعديل باسمك في «سجل التعديلات» مع القيمة قبل وبعد")}.</span></p>
    ${dues && !p.extra && p.amount > (m.monthly || 0) + 0.005 ? `<div class="banner info" style="margin:10px 0 0">${icon('calendar')}<span class="grow">${T("هذا مبلغ مجمّع لأكثر من شهر. قسّمه ليصبح كل شهر دفعة مستقلة تُعدّل وحدها")}</span><button type="button" class="btn sm" id="pSplit">${T("تقسيم على الأشهر")}</button></div>` : ''}
    <div class="mf"><button class="btn primary">${icon('check')}${T("حفظ التعديل")}</button><button type="button" class="btn" data-x>${T("إلغاء")}</button></div></form>`);
  const sp = $('#pSplit', md.el);
  if (sp) sp.onclick = () => busy(sp, async () => {
    const r = await bapi(`/fund/payments/${p.id}/split`, { method: 'POST' });
    md.close(); toast(`${T("تم التقسيم")}: ${r.parts} ${T("دفعات")} ✓`, 'ok'); after();
  });
  const f = $('form', md.el);
  // picking a month means "for that month"
  if (f.for_month) { f.for_month.addEventListener('change', () => { f.querySelector('[name=mode][value=month]').checked = true; }); f.for_month.addEventListener('focus', () => { f.querySelector('[name=mode][value=month]').checked = true; }); }
  f.onsubmit = (e) => { e.preventDefault(); busy(e.submitter, async () => {
    const body = { amount: f.amount.value, note: f.note.value };
    if (dues) Object.assign(body, { mode: f.mode.value, for_month: f.for_month.value });
    await bapi('/fund/payments/' + p.id, { method: 'PUT', body });
    md.close(); toast(T("تم حفظ التعديل"), 'ok'); after();
  }); };
}

/* ───────────── members & family tree ───────────── */
// state of a person in the tree: paid up / owes this month / late (arrears) / not contributing
const nodeState = (m) => !m || !m.contributing || m.monthly === undefined ? 'none' : m.arrears > 0.005 ? 'late' : m.this_month && m.this_month.remaining > 0.005 ? 'due' : 'ok';
const NODE_L = { ok: T("ملتزم"), due: T("عليه اشتراك هذا الشهر"), late: T("متأخر"), none: T("غير مشترك") };
VIEWS.members = async (el, _, keep) => {
  const d = keep || await bapi('/fund/overview');
  S.fund = d;
  const st = VIEWS.members.st || (VIEWS.members.st = { zoom: 1, fit: true, collapsed: new Set(), sel: null });
  if (!keep) st.fit = true; // opening the page: fit the whole tree on the screen
  const manage = can('fund_manage');
  const mineMap = new Map(d.mine.map(m => [m.id, m]));
  // supervisors get the full figures; a member gets names only, plus their own (and their children's) figures
  const list = (d.full ? d.members : d.tree).map(m => mineMap.has(m.id) && !d.full ? { ...m, ...mineMap.get(m.id) } : m);
  const byId = new Map(list.map(m => [m.id, m]));
  // a wife / mother stands beside her husband (one frame); their children hang under the couple
  const isWife = (m) => !!(m.spouse_id && byId.has(m.spouse_id));
  const wivesOf = (id) => list.filter(m => m.spouse_id === id);
  const kids = (pid) => list.filter(m => !isWife(m) && (m.parent_id || null) === pid);
  const kidsOf = (m) => { // the father's children (plus any recorded under the mother herself), grouped by mother
    const w = wivesOf(m.id), all = [...kids(m.id), ...w.flatMap(x => kids(x.id))];
    const mom = (k) => w.findIndex(x => x.id === (k.mother_id || k.parent_id));
    return w.length > 1 ? all.sort((a, b) => mom(a) - mom(b)) : all;
  };
  const below = (m) => isWife(m) ? [] : [...wivesOf(m.id), ...kidsOf(m)];
  const subtotal = (m) => (m.total_paid || 0) + below(m).reduce((a, k) => a + subtotal(k), 0);
  const people = (m) => (m.contributing ? 1 : 0) + below(m).reduce((a, k) => a + people(k), 0);
  const allBelow = (m) => below(m).reduce((a, k) => a + 1 + allBelow(k), 0);
  const roots = list.filter(m => !isWife(m) && (!m.parent_id || !byId.has(m.parent_id)));
  const motherOf = (k) => byId.get(k.mother_id) || (byId.get(k.parent_id) && isWife(byId.get(k.parent_id)) ? byId.get(k.parent_id) : null);
  const fatherOf = (k) => { const p = byId.get(k.parent_id); return p && isWife(p) ? byId.get(p.spouse_id) : p; };
  const known = (m) => d.full || mineMap.has(m.id);
  const person = (m, { tog = '', mom = '' } = {}) => {
    const state = known(m) ? nodeState(m) : 'none';
    return `<div class="onode s-${state} ${m.deceased ? 'dead' : ''} ${isWife(m) ? 'wife' : ''} ${mineMap.has(m.id) ? 'me' : ''} ${st.sel === m.id ? 'sel' : ''}" data-n="${m.id}" title="${esc(m.name)}${known(m) ? ' — ' + NODE_L[state] : ''}">
      <span class="on-name">${esc(m.name)}</span>
      ${m.deceased ? `<small>${isWife(m) ? T("رحمها الله") : T("رحمه الله")}</small>` : known(m) && m.contributing ? `<small class="num">${money(m.monthly)}</small>` : ''}
      ${mom ? `<small class="omom">${T("أمه:")} ${esc(mom)}</small>` : ''}${tog}</div>`;
  };
  const node = (m, mom = '') => {
    const wives = wivesOf(m.id), ch = kidsOf(m), closed = st.collapsed.has(m.id);
    const tog = ch.length ? `<button type="button" class="otog" data-t="${m.id}" title="${closed ? T("إظهار الأبناء") : T("إخفاء الأبناء")}">${closed ? '+' + allBelow(m) : '−'}</button>` : '';
    const top = wives.length ? `<div class="ocouple">${person(m, { tog, mom })}${wives.map(w => `<span class="olink" aria-hidden="true"><i></i><b>♥</b><i></i></span>${person(w)}`).join('')}</div>` : person(m, { tog, mom });
    return `<li>${top}${ch.length && !closed ? `<ul>${ch.map(k => node(k, wives.length > 1 ? motherOf(k)?.name || '' : '')).join('')}</ul>` : ''}</li>`;
  };
  const panel = () => {
    const m = byId.get(st.sel);
    if (!m) return `<div class="op-empty">${icon('users')}<p>${T("اضغط على أي شخص في الشجرة لعرض تفاصيله")}</p>
      ${manage && !list.length ? `<p class="small">${T("ابدأ برأس العائلة (مثلاً: عائلة فلان، أو الجد رحمه الله) ثم أضف الأبناء تحته")}</p>` : ''}</div>`;
    const wife = isWife(m), father = wife ? null : fatherOf(m), mother = wife ? null : motherOf(m);
    const ch = wife ? kidsOf(byId.get(m.spouse_id)).filter(k => motherOf(k)?.id === m.id) : kidsOf(m);
    const rel = wife ? ` · ${T("زوجة")} ${esc(byId.get(m.spouse_id).name)}` : father ? ` · ${T("ابن/ة")} ${esc(father.name)}${mother ? ` ${T("و")} ${esc(mother.name)}` : ''}` : '';
    const head = `<div class="op-head"><div class="op-av s-${known(m) ? nodeState(m) : 'none'}">${esc(initials(m.name))}</div>
      <div><b>${esc(m.name)}</b><div class="small muted">${m.deceased ? (wife ? T("رحمها الله") : T("رحمه الله")) : known(m) ? NODE_L[nodeState(m)] : T("عضو في الصندوق")}${rel}</div></div></div>`;
    if (!known(m)) return head + (ch.length ? `<p class="small muted">${ch.length} ${T("من الأبناء في الشجرة")}</p>` : '');
    const rows = m.contributing ? [
      [T("الاشتراك الشهري"), money(m.monthly)], [T("إجمالي المساهمة"), `<b>${money(m.total_paid)}</b>`],
      [T("المتأخرات"), m.arrears ? `<b class="neg-t">${money(m.arrears)}</b>` : '—'], [T("أشهر التعثر"), m.late_months || '—'],
      [T("الالتزام"), `${pct(m.commitment)} ${ratingBadge(m.rating)}`],
    ] : [[T("الحالة"), m.deceased ? T("رحمه الله") : T("غير مشترك")]];
    if (ch.length && d.full) rows.push([T("مجموع عائلته"), `<b>${money(subtotal(m))}</b> <span class="muted small">· ${people(m)} ${T("مساهم")}</span>`]);
    return `${head}<div class="op-rows">${rows.map(([l, v]) => `<div class="r"><span>${l}</span><span>${v}</span></div>`).join('')}</div>
      ${m.contributing && m.months ? `<div class="sec-title small">${T("آخر 6 أشهر")}</div>${monthStrip(m.months, 6)}` : ''}
      <div class="op-acts">${m.contributing ? `<button class="btn sm" data-full="${m.id}">${icon('list')}${T("التفاصيل والدفعات")}</button>` : ''}
        ${manage ? `<button class="btn sm" data-edit="${m.id}">${icon('edit')}${T("تعديل")}</button>
          ${wife ? `<button class="btn sm primary" data-add="${m.spouse_id}" data-mom="${m.id}">${icon('plus')}${T("إضافة ابن / ابنة")}</button>`
            : `${!ch.length && !wivesOf(m.id).length && list.some(r => r.id !== m.id && !isWife(r)) ? `<button class="btn sm primary" data-asw="${m.id}">${icon('heart')}${T("ربطها كزوجة (أم) بجانب زوجها")}</button>` : ''}<button class="btn sm" data-wife="${m.id}">${icon('plus')}${T("إضافة زوجة (أم)")}</button><button class="btn sm primary" data-add="${m.id}">${icon('plus')}${T("إضافة ابن / ابنة")}</button>`}` : ''}</div>`;
  };
  const draw = () => {
    el.innerHTML = `${pageHead('users', T("شجرة العائلة"), d.full ? `${list.length} ${T("فرد")} · ${d.totals.contributors} ${T("مساهم")}` : T("أفراد العائلة المسجلون في الصندوق"),
      manage ? `<button class="btn primary" id="bAddM">${icon('plus')}${T("عضو جديد")}</button>` : '')}
    <div class="ft-wrap">
      <section class="card ft-card">
        <div class="ft-tools">
          <div class="legend small" style="margin:0">${(d.full ? ['ok', 'due', 'late', 'none'] : ['none']).map(s => `<span><i class="ldot s-${s}"></i>${NODE_L[s]}</span>`).join('')}<span><i class="ldot dead"></i>${T("رحمه الله")}</span></div>
          <span class="grow"></span>
          <button class="icon-btn" data-z="-1" title="${T("تصغير")}">−</button><button class="icon-btn" data-z="0" title="${T("الحجم الأصلي")}">${Math.round(st.zoom * 100)}%</button><button class="icon-btn" data-z="1" title="${T("تكبير")}">+</button>
          <button class="btn sm ghost" data-z="fit">${T("ملاءمة الشاشة")}</button><button class="btn sm ghost" id="bOpenAll">${T("فتح الكل")}</button>
        </div>
        <div class="ft-scroll">${list.length ? `<div class="otree" style="zoom:${st.zoom}"><ul>${roots.map(node).join('')}</ul></div>`
          : `<div class="empty">${T("لا يوجد أعضاء بعد")}${manage ? ` — ${T("اضغط «عضو جديد» وابدأ برأس العائلة")}` : ''}</div>`}</div>
      </section>
      <aside class="card ft-panel" id="ftPanel">${panel()}</aside>
    </div>`;
    const redraw = () => VIEWS.members(el, _, d);
    $$('[data-n]', el).forEach(n => n.onclick = (e) => { if (e.target.closest('[data-t]')) return; st.sel = Number(n.dataset.n); redraw(); if (innerWidth < 900) $('#ftPanel').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    $$('[data-t]', el).forEach(b => b.onclick = () => { const id = Number(b.dataset.t); st.collapsed.has(id) ? st.collapsed.delete(id) : st.collapsed.add(id); redraw(); });
    $$('[data-z]', el).forEach(b => b.onclick = () => {
      if (b.dataset.z === 'fit') { st.fit = true; return redraw(); }
      const z = Number(b.dataset.z); st.zoom = z === 0 ? 1 : Math.min(1.6, Math.max(0.3, Math.round((st.zoom + z * 0.15) * 100) / 100)); redraw();
    });
    // fit: shrink a wide tree to the width of the screen (never enlarge), then keep it centred
    const sc = $('.ft-scroll', el), tr = $('.otree', el);
    if (tr && st.fit) {
      st.fit = false;
      const natural = tr.scrollWidth / st.zoom;
      const z = Math.max(innerWidth < 640 ? 0.55 : 0.3, Math.min(1, Math.floor((sc.clientWidth - 12) / natural * 100) / 100));
      if (Math.abs(z - st.zoom) > 0.005) { st.zoom = z; return redraw(); }
    }
    if (tr && sc.scrollWidth > sc.clientWidth) { const mid = (sc.scrollWidth - sc.clientWidth) / 2; sc.scrollLeft = document.dir === 'rtl' || getComputedStyle(sc).direction === 'rtl' ? -mid : mid; }
    $('#bOpenAll').onclick = () => { st.collapsed.clear(); redraw(); };
    const reload = () => VIEWS.members(el);
    if (manage) {
      $('#bAddM').onclick = () => { const s = byId.get(st.sel); memberForm(null, s && isWife(s) ? s.spouse_id : st.sel, d, reload, s && isWife(s) ? { mother: s.id } : {}); };
      $$('[data-add]', el).forEach(b => b.onclick = () => memberForm(null, Number(b.dataset.add), d, reload, { mother: Number(b.dataset.mom) || null }));
      $$('[data-wife]', el).forEach(b => b.onclick = () => memberForm(null, null, d, reload, { role: 'wife', spouse: Number(b.dataset.wife) }));
      // a mother entered on her own as a family head: put her beside her husband (suggest the head who has children)
      $$('[data-asw]', el).forEach(b => b.onclick = () => { const me = byId.get(Number(b.dataset.asw));
        const head = (me && me.parent_id && byId.get(me.parent_id) && !isWife(byId.get(me.parent_id)) ? byId.get(me.parent_id) : null) || roots.find(r => r.id !== me.id && kidsOf(r).length);
        memberForm(d.members.find(x => x.id === Number(b.dataset.asw)), null, d, reload, { role: 'wife', spouse: head && head.id }); });
      $$('[data-edit]', el).forEach(b => b.onclick = () => memberForm(d.members.find(m => m.id == b.dataset.edit), null, d, reload));
    }
    $$('[data-full]', el).forEach(b => b.onclick = () => memberDetail(Number(b.dataset.full)));
  };
  draw();
};

function memberForm(m, parentId, d, after, preset = {}) {
  const now = d.now;
  const descendants = new Set();
  if (m) { const walk = (id) => d.members.filter(x => x.parent_id === id || x.spouse_id === id).forEach(x => { if (!descendants.has(x.id)) { descendants.add(x.id); walk(x.id); } }); walk(m.id); }
  const byId = new Map(d.members.map(x => [x.id, x]));
  const wifeOf = (x) => x.spouse_id && byId.has(x.spouse_id);
  // fathers / husbands: anyone who is not a wife, not this member and not under them
  const parents = d.members.filter(x => !wifeOf(x) && (!m || (x.id !== m.id && !descendants.has(x.id))));
  const hasWives = m && d.members.some(x => x.spouse_id === m.id);
  // an older entry made the mother the "parent": show it as father + mother
  let pSel = m ? m.parent_id : parentId, momSel = m ? m.mother_id : preset.mother;
  if (pSel && byId.get(pSel) && wifeOf(byId.get(pSel))) { momSel = pSel; pSel = byId.get(pSel).spouse_id; }
  const role = m && wifeOf(m) ? 'wife' : preset.role || 'child';
  const cats = d.categories.filter(c => c.active || (m && c.id === m.category_id));
  const md = modal(m ? T("تعديل عضو") : T("عضو جديد"), `<form id="fM" autocomplete="off">
    <div class="fgrid">
      <label class="full">${T("الاسم")}<input name="name" required maxlength="100" value="${esc(m?.name || '')}" placeholder="${T("مثال: محمد بن عبدالله، أو: عائلة آل فلان")}"></label>
      <label>${T("الصلة في الشجرة")}<select name="role"><option value="child" ${role === 'child' ? 'selected' : ''}>${T("ابن / ابنة (أو رأس عائلة)")}</option>${hasWives ? '' : `<option value="wife" ${role === 'wife' ? 'selected' : ''}>${T("زوجة (أم الأبناء)")}</option>`}</select></label>
      <label data-r="child">${T("الأب في الشجرة")}<select name="parent_id"><option value="">${T("— رأس العائلة (بدون أب) —")}</option>${opt(parents, pSel, x => [x.id, x.name])}</select></label>
      <label data-r="mom">${T("الأم")} <span class="opt">${T("(اختياري)")}</span><select name="mother_id"></select></label>
      <label data-r="wife">${T("الزوج")}<select name="spouse_id"><option value="">— ${T("اختر الزوج")} —</option>${opt(parents.filter(x => !wifeOf(x)), (m && m.spouse_id) || preset.spouse, x => [x.id, x.name])}</select></label>
      <label>${T("فئة الاشتراك")}<select name="category_id"><option value="">—</option>${opt(cats, m ? m.category_id : cats[0]?.id, c => [c.id, `${T(c.name)} — ${money(c.amount)}`])}</select></label>
      ${m ? '' : `<label>${T("مبلغ خاص")} <span class="opt">${T("(اختياري — بدل مبلغ الفئة)")}</span><input name="amount" type="number" step="0.01" min="0" inputmode="decimal"></label>`}
      <label>${T("شهر الانضمام")}<input name="join_month" type="month" value="${m?.join_month || (d.settings.start_month > now ? d.settings.start_month : now)}"></label>
      ${m ? `<label>${T("شهر الخروج")} <span class="opt">${T("(إن توقف عن الاشتراك)")}</span><input name="left_month" type="month" value="${m.left_month || ''}"></label>` : ''}
      <label class="full">${T("ملاحظات")} <span class="opt">${T("(اختياري)")}</span><input name="notes" value="${esc(m?.notes || '')}"></label>
    </div>
    <div class="row" style="margin:12px 0">
      <label class="check"><input type="checkbox" name="contributing" ${!m || m.contributing ? 'checked' : ''}> ${T("مساهم (يدفع اشتراكاً شهرياً)")}</label>
      <label class="check"><input type="checkbox" name="guardian_access" ${!m || m.guardian_access ? 'checked' : ''}> ${T("يستطيع الأب / الأم متابعته من حسابه")} <span class="opt">${T("(رؤية الدفعات والكشف والإيصالات)")}</span></label>
      <label class="check"><input type="checkbox" name="guardian_act" ${m?.guardian_act ? 'checked' : ''}> ${T("يستطيع الأب / الأم طلب قرض باسمه")} <span class="opt">${T("(موافقة منفصلة)")}</span></label>
      <label class="check"><input type="checkbox" name="deceased" ${m?.deceased ? 'checked' : ''}> ${T("متوفى (رحمه الله)")}</label>
    </div>
    ${m ? `<div class="sec-title">${icon('coins')}<span class="grow">${T("الاشتراك الشهري الحالي")}: <b>${money(m.monthly)}</b></span><button type="button" class="btn sm" id="bRate">${icon('edit')}${T("تغيير المبلغ")}</button></div>
      <div class="sec-title">${icon('key')}<span class="grow">${T("حساب الدخول")}: ${m.user_id ? `<b>${T("موجود")}</b>` : `<span class="muted">${T("لا يوجد")}</span>`}</span><button type="button" class="btn sm" id="bAcc">${icon('key')}${m.user_id ? T("إدارة الحساب") : T("إنشاء أو ربط حساب")}</button></div>` : ''}
    <div class="mf">${m ? `<button type="button" class="btn danger" id="bDelM">${icon('trash')}${T("حذف")}</button><span class="grow"></span>` : ''}<button class="btn primary">${T("حفظ")}</button></div></form>`, { wide: true });
  const f = $('#fM', md.el);
  f.deceased.onchange = () => { if (f.deceased.checked) f.contributing.checked = false; };
  const guard = () => { f.guardian_act.disabled = !f.guardian_access.checked; if (!f.guardian_access.checked) f.guardian_act.checked = false; };
  f.guardian_access.onchange = guard; guard();
  // child: father + (one of his wives as) mother · wife: her husband
  const sync = () => {
    const wife = f.role.value === 'wife';
    $('[data-r=child]', f).hidden = wife; $('[data-r=wife]', f).hidden = !wife; f.spouse_id.required = wife;
    const pid = Number(f.parent_id.value) || null, cur = Number(f.mother_id.value) || momSel;
    const moms = pid ? d.members.filter(x => x.spouse_id === pid && (!m || x.id !== m.id)) : [];
    f.mother_id.innerHTML = `<option value="">— ${T("غير محددة")} —</option>` + opt(moms, cur, x => [x.id, x.name]);
    $('[data-r=mom]', f).hidden = wife || !moms.length;
  };
  f.role.onchange = sync; f.parent_id.onchange = () => { momSel = null; sync(); }; sync();
  f.onsubmit = (e) => {
    e.preventDefault();
    busy(e.submitter, async () => {
      const { role: r, ...fo } = formObj(f);
      const body = { ...fo, ...(r === 'wife' ? { parent_id: '', mother_id: '' } : { spouse_id: '', mother_id: $('[data-r=mom]', f).hidden ? '' : fo.mother_id }),
        contributing: f.contributing.checked, guardian_access: f.guardian_access.checked, guardian_act: f.guardian_access.checked && f.guardian_act.checked, deceased: f.deceased.checked };
      if (m) await bapi('/fund/members/' + m.id, { method: 'PUT', body }); else await bapi('/fund/members', { method: 'POST', body });
      md.close(); toast(T("تم الحفظ"), 'ok'); after();
    });
  };
  if (!m) return;
  $('#bRate', md.el).onclick = () => rateForm(m, now, () => { md.close(); after(); });
  $('#bAcc', md.el).onclick = () => accountForm(m, () => { md.close(); after(); });
  $('#bDelM', md.el).onclick = async () => {
    if (!await confirmBox(T("حذف عضو"), `<p>${T("حذف")} <b>${esc(m.name)}</b>؟ ${T("لا يمكن حذف من له دفعات أو أبناء — حدد له «شهر الخروج» بدلاً من ذلك")}.</p>`, T("حذف"), true)) return;
    try { await bapi('/fund/members/' + m.id, { method: 'DELETE' }); md.close(); toast(T("تم الحذف"), 'ok'); after(); } catch (e) { fail(e); }
  };
}
function rateForm(m, now, after) {
  const md = modal(`${T("تغيير الاشتراك الشهري")} — ${m.name}`, `<form>
    <div class="fgrid"><label>${T("المبلغ الشهري الجديد")}<input name="amount" type="number" step="0.01" min="0" inputmode="decimal" required value="${m.monthly}"></label>
    <label>${T("يبدأ من شهر")}<input name="from_month" type="month" required value="${now}"></label></div>
    <p class="hint">${icon('info')}<span>${T("الأشهر السابقة تبقى بمبلغها القديم، فلا تتأثر نسبة الالتزام")}.</span></p>
    <div class="mf"><button class="btn primary">${T("حفظ")}</button></div></form>`);
  $('form', md.el).onsubmit = (e) => { e.preventDefault(); busy(e.submitter, async () => { await bapi(`/fund/members/${m.id}/rate`, { method: 'POST', body: formObj(e.target) }); md.close(); toast(T("تم الحفظ"), 'ok'); after(); }); };
}
function accountForm(m, after) {
  const gen = () => { const c = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'; const a = new Uint32Array(10); crypto.getRandomValues(a); return [...a].map(x => c[x % c.length]).join(''); };
  const showLogin = (username, password) => modal(T("بيانات الدخول"), `<div class="summary-box"><div class="r"><span>${T("الرابط")}</span><b dir="ltr">${esc(location.origin)}</b></div>
    ${username ? `<div class="r"><span>${T("اسم الدخول")}</span><b dir="ltr">${esc(username)}</b></div>` : ''}<div class="r"><span>${T("كلمة المرور")}</span><b dir="ltr">${esc(password)}</b></div></div>
    <p class="hint">${icon('alert')}<span>${T("أرسلها للعضو بشكل خاص")}.</span></p>
    <div class="mf"><button class="btn primary block" data-x>${T("تم")}</button></div>`);
  if (m.user_id) return linkedAccount(m, after, gen, showLogin);
  const md = modal(`${T("حساب دخول")} — ${m.name}`, `<form autocomplete="off">
    <div class="row" style="margin-bottom:12px">
      <label class="check"><input type="radio" name="mode" value="new" checked> ${T("إنشاء حساب جديد")}</label>
      <label class="check"><input type="radio" name="mode" value="link"> ${T("ربط بحساب موجود")}</label>
    </div>
    <div data-new>
      <label>${T("اسم الدخول (إنجليزي)")}<input name="username" dir="ltr" pattern="[A-Za-z0-9._\\-]{3,40}" placeholder="ahmed.m"></label>
      <label>${T("كلمة المرور")}<input name="password" dir="ltr" value="${gen()}"></label>
      <p class="hint">${icon('info')}<span>${T("أعطِ العضو اسم الدخول وكلمة المرور. يستطيع تغييرها متى شاء من زر «تغيير كلمة المرور»")}.</span></p>
    </div>
    <div data-link hidden>
      <label>${T("اسم الدخول للحساب الموجود")}<input name="existing" dir="ltr" list="accList" placeholder="${T("اكتب أو اختر من القائمة")}"></label>
      <datalist id="accList"></datalist>
      <p class="hint">${icon('info')}<span>${T("مثلاً: حسابك أنت أو حساب مشرف أو شخص له حساب في نشاط آخر — يدخل بنفس اسمه وكلمة مروره ويرى بياناته في الصندوق")}.</span></p>
    </div>
    <div class="mf"><button class="btn primary">${icon('key')}${T("حفظ")}</button></div></form>`);
  const f = $('form', md.el);
  const sync = () => { const link = f.mode.value === 'link'; $('[data-new]', f).hidden = link; $('[data-link]', f).hidden = !link; f.username.required = !link; f.password.required = !link; f.existing.required = link; };
  $$('[name=mode]', f).forEach(r => r.onchange = sync); sync();
  bapi('/fund/accounts').then(list => { $('#accList', md.el).innerHTML = list.map(u => `<option value="${esc(u.username)}">${esc(u.name)}</option>`).join(''); }).catch(() => { });
  f.onsubmit = (e) => {
    e.preventDefault();
    busy(e.submitter, async () => {
      if (f.mode.value === 'link') {
        const r = await bapi(`/fund/members/${m.id}/link`, { method: 'POST', body: { username: f.existing.value.trim() } });
        md.close(); toast(`${T("تم الربط بحساب")} ${r.name} (${r.username})`, 'ok'); after(); return;
      }
      const body = { username: f.username.value.trim(), password: f.password.value };
      await bapi(`/fund/members/${m.id}/account`, { method: 'POST', body });
      md.close(); showLogin(body.username, body.password); after();
    });
  };
}
// a member that already has an account: who it is, change its password, or unlink it
async function linkedAccount(m, after, gen, showLogin) {
  const d = await bapi('/fund/members/' + m.id).catch(() => ({}));
  const md = modal(`${T("حساب الدخول")} — ${m.name}`, `<div class="summary-box"><div class="r"><span>${T("مرتبط بالحساب")}</span><b dir="ltr">${esc(d.username || '—')}</b></div></div>
    <form autocomplete="off" style="margin-top:12px">
      <label>${T("كلمة مرور جديدة")}<input name="password" required dir="ltr" value="${gen()}"></label>
      <div class="mf"><button type="button" class="btn danger" id="bUnlink">${icon('x')}${T("فك الربط")}</button><span class="grow"></span><button class="btn primary">${icon('key')}${T("تغيير كلمة المرور")}</button></div>
    </form>`);
  $('form', md.el).onsubmit = (e) => {
    e.preventDefault();
    busy(e.submitter, async () => {
      const password = e.target.password.value;
      await bapi(`/fund/members/${m.id}/password`, { method: 'POST', body: { password } });
      md.close(); showLogin(d.username, password); after();
    });
  };
  $('#bUnlink', md.el).onclick = async () => {
    if (!await confirmBox(T("فك الربط"), `<p>${T("فك ربط")} <b>${esc(m.name)}</b> ${T("عن الحساب")} <b dir="ltr">${esc(d.username || '')}</b>؟ ${T("الحساب نفسه لا يُحذف، وبيانات العضو تبقى كما هي")}.</p>`, T("فك الربط"), true)) return;
    try { await bapi(`/fund/members/${m.id}/unlink`, { method: 'POST' }); md.close(); toast(T("تم فك الربط"), 'ok'); after(); } catch (e) { fail(e); }
  };
}

/* ───────────── loans: requests, decisions, register ───────────── */
const REQ_ST = { pending: [T("قيد المراجعة"), 'warn', 'clock'], approved: [T("تمت الموافقة"), 'pos', 'check'], rejected: [T("مرفوض"), 'neg', 'x'], cancelled: [T("ملغى"), 'muted', 'x'] };
const reqBadge = (s) => { const [l, c, ic] = REQ_ST[s] || REQ_ST.pending; return `<span class="badge ${c}">${icon(ic)}${l}</span>`; };
const flagText = (m) => m.max_run >= 3 ? `${m.max_run} ${T("أشهر متتالية")}` : `${m.late_months} ${T("أشهر متفرقة")}`;
VIEWS.loans = (el) => loansPage(el, 'admin');
VIEWS.loanreq = (el) => loansPage(el, 'req');
async function loansPage(el, mode) {
  const manage = can('fund_manage') && mode === 'admin', full = can('fund_view_all') || can('fund_manage');
  const [d, reqs, ben] = await Promise.all([bapi('/fund/overview'), bapi('/fund/requests'), bapi('/fund/beneficiaries')]);
  S.fund = d;
  const pend = reqs.filter(r => r.status === 'pending');
  const mineIds = new Set(d.mine.map(m => m.id));
  const myReqs = reqs.filter(r => mineIds.has(r.member_id));
  const reload = () => loansPage(el, mode);
  // ── what a member sees about themselves ──
  const myBox = mode !== 'req' ? '' : d.mine.length ? `<section class="card"><div class="card-head"><h3>${icon('hand')}${T("طلب قرض")}</h3>
      <button class="btn primary" id="bReq">${icon('plus')}${T("تقديم طلب قرض")}</button></div>
    ${d.mine.map(m => `<div class="summary-box" style="margin-bottom:10px"><div class="r"><span><b>${esc(m.name)}</b>${m.relation === 'child' ? ` <span class="badge info">${T("من أبنائك")}</span>` : ''}</span><span>${ratingBadge(m.rating)}</span></div>
      <div class="r"><span>${m.relation === 'child' ? T("مساهماته") : T("مساهماتك")}</span><b>${money(m.total_paid)}</b></div><div class="r"><span>${T("الحد المسموح للقرض")} <span class="muted small">(${m.relation === 'child' ? T("من مساهماته هو فقط") : T("من مساهماتك أنت فقط")})</span></span><b>${money(m.loan_limit)}</b></div>
      ${m.relation === 'child' && !m.guardian_act ? `<div class="r"><span class="muted small">${T("طلب قرض باسمه يحتاج موافقة المشرف")}</span></div>` : ''}
      ${m.flagged ? `<div class="r"><span class="neg-t">${icon('alert')}${T("تعثّر")}: ${flagText(m)}</span><span class="neg-t small">${T("قد يكون سبباً في رفض الطلب")}</span></div>` : ''}
      ${m.loans.filter(l => l.status === 'active').map(l => `<div class="r"><span>${T("قرض قائم")} ${money(l.amount)}</span><b>${T("المتبقي")} ${money(l.remaining)}</b></div>`).join('')}</div>`).join('')}
    ${myReqs.length ? `<div class="sec-title">${icon('list')}<span class="grow">${T("طلباتي")}</span></div><div class="tbl-wrap"><table><tbody>
      ${myReqs.map(r => `<tr><td>${esc(r.member_name)}</td><td class="n"><b>${money(r.amount)}</b></td><td>${r.months} ${T("شهر")}</td><td class="small muted">${r.created_at.slice(0, 10)}</td><td>${reqBadge(r.status)}${r.decision_note ? `<div class="small muted">${esc(r.decision_note)}</div>` : ''}</td>
        <td class="row-acts">${r.status === 'pending' && r.requested_by === S.me.user.id ? `<button class="btn sm" data-cancel="${r.id}">${T("إلغاء الطلب")}</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : ''}
  </section>` : `<section class="card"><div class="empty">${icon('info')} ${T("حسابك غير مربوط بعضو في الصندوق، لذلك لا يمكنك طلب قرض. يربطه المشرف من «شجرة العائلة» ← العضو ← «إنشاء حساب»")}.</div></section>`;
  // ── supervisor: waiting requests with everything needed to decide ──
  const queue = mode === 'admin' && can('fund_manage') ? `<section class="card"><h3>${icon('clock')}${T("طلبات بانتظار القرار")} <span class="badge ${pend.length ? 'warn' : 'muted'}">${pend.length}</span></h3>
    ${pend.length ? pend.map(r => `<div class="req-card">
      <div class="rq-h"><b>${esc(r.member_name)}</b><span class="muted small">${r.created_at.slice(0, 16)}${r.requested_by_name && r.requested_by_name !== r.member_name ? ` · ${T("بواسطة")} ${esc(r.requested_by_name)}` : ''}</span><span class="grow"></span><b class="num big-n">${money(r.amount)}</b></div>
      <div class="rq-g">
        <span>${T("المدة")}: <b>${r.months} ${T("شهر")}</b> (${T("القسط")} ≈ ${money(Math.ceil(r.amount / r.months))})</span>
        <span>${T("مساهماته")}: <b>${money(r.total_paid)}</b></span>
        <span class="${r.amount > r.limit + 0.005 ? 'neg-t' : ''}">${T("الحد المسموح")}: <b>${money(r.limit)}</b>${r.amount > r.limit + 0.005 ? ` · ${T("يتجاوزه")}` : ''}</span>
        <span>${T("الالتزام")}: <b>${pct(r.commitment)}</b> ${ratingBadge(r.rating)}</span>
        ${r.flagged ? `<span class="neg-t">${icon('alert')}${T("تعثّر")}: ${flagText(r)}</span>` : ''}
        ${r.active_loans ? `<span class="neg-t">${T("عليه قرض قائم")}: ${money(r.active_loans)}</span>` : ''}
        <span class="${r.amount > r.balance ? 'neg-t' : ''}">${T("رصيد الصندوق المتاح")}: <b>${money(r.balance)}</b></span>
        ${r.anonymous ? `<span>★★★ ${T("طلب إخفاء اسمه")}</span>` : ''}
      </div>
      ${r.reason ? `<p class="small" style="margin:6px 0"><span class="muted">${T("السبب")}:</span> ${esc(r.reason)}</p>` : ''}
      <div class="row"><button class="btn sm primary" data-appr="${r.id}">${icon('check')}${T("موافقة وصرف")}</button><button class="btn sm danger" data-rej="${r.id}">${icon('x')}${T("رفض")}</button></div>
    </div>`).join('') : `<p class="muted small">${T("لا توجد طلبات جديدة")}</p>`}
    ${reqs.some(r => r.status !== 'pending') ? `<details class="small" style="margin-top:10px"><summary>${T("الطلبات السابقة")}</summary><div class="tbl-wrap"><table><tbody>
      ${reqs.filter(r => r.status !== 'pending').map(r => `<tr><td>${esc(r.member_name)}</td><td class="n">${money(r.amount)}</td><td>${reqBadge(r.status)}</td><td class="muted">${esc(r.decided_by_name)} · ${(r.decided_at || '').slice(0, 10)}</td><td class="muted">${esc(r.decision_note || '')}</td></tr>`).join('')}</tbody></table></div></details>` : ''}
  </section>` : '';
  // ── supervisor: when each loan is collected ──
  const mdiff = (a, b) => (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12 + Number(b.slice(5, 7)) - Number(a.slice(5, 7));
  const addM = (m, n) => { for (let i = 0; i < n; i++) m = nextMon(m); return m; };
  const act = (mode === 'admin' && d.loans ? d.loans : []).filter(l => l.status === 'active').map(l => {
    const elapsed = l.start_month <= d.now ? mdiff(l.start_month, d.now) + 1 : 0;
    const dueNow = Math.max(0, Math.min(l.amount, l.installment * elapsed) - l.paid);
    const left = Math.ceil(l.remaining / l.installment - 0.0001);
    const from = l.start_month > d.now ? l.start_month : d.now;
    return { ...l, dueNow: r2(dueNow), left, end: addM(from, Math.max(0, left - 1)), next: from };
  }).sort((a, b) => b.dueNow - a.dueNow);
  const ahead = Array.from({ length: 6 }, (_, i) => { const m = addM(d.now, i); let tot = 0;
    for (const l of act) { const k = mdiff(l.next, m); if (k >= 0 && k < l.left) tot += Math.min(l.installment, l.remaining - k * l.installment); }
    return { m, tot: r2(tot) }; });
  const schedule = mode !== 'admin' ? '' : `<section class="card"><div class="card-head"><h3>${icon('calendar')}${T("جدول التحصيل")}</h3>${can('fund_collect') ? `<a class="btn sm" href="#/collect">${T("التحصيل الشهري")}</a>` : ''}</div>
    ${act.length ? `<div class="ahead">${ahead.map((x, i) => `<div class="ah ${i ? '' : 'now'}"><small>${monLabel(x.m)}</small><b class="num">${money(x.tot)}</b><small class="muted">${i ? T("أقساط متوقعة") : T("المستحق هذا الشهر")}</small></div>`).join('')}</div>
    <div class="tbl-wrap"><table><thead><tr><th>${T("المستفيد")}</th><th>${T("القسط")}</th><th>${T("المسدد")} / ${T("مبلغ القرض")}</th><th>${T("المتبقي")}</th><th>${T("المستحق الآن")}</th><th>${T("أقساط متبقية")}</th><th>${T("ينتهي في")}</th><th></th></tr></thead><tbody>
      ${act.map(l => `<tr><td><b>${esc(l.member_name)}</b>${l.anonymous ? ' <span class="badge muted">★★★</span>' : ''}</td><td class="n">${money(l.installment)}</td>
        <td class="n">${money(l.paid)} / ${money(l.amount)}</td><td class="n"><b>${money(l.remaining)}</b></td>
        <td class="n">${l.dueNow ? `<b class="${l.arrears ? 'neg-t' : ''}">${money(l.dueNow)}</b>${l.arrears ? ` <span class="badge neg">${T("متأخر")}</span>` : ''}` : (l.start_month > d.now ? `<span class="muted small">${T("يبدأ")} ${monLabel(l.start_month)}</span>` : '<span class="badge pos">✓</span>')}</td>
        <td class="n">${l.left}</td><td class="small">${monLabel(l.end)}</td><td class="row-acts"><button class="btn sm" data-le="${l.id}">${icon('edit')}</button></td></tr>`).join('')}
    </tbody></table></div>` : `<p class="muted small">${T("لا توجد قروض جارية")}</p>`}</section>`;
  // ── beneficiaries register (everyone) ──
  const t = ben.totals;
  const register = `<section class="card"><div class="card-head"><h3>${icon('clipboard')}${T("سجل المستفيدين")}</h3>
      <button class="btn sm" id="bLcsv">${icon('download')}${T("تنزيل Excel")}</button></div>
    <div class="grid kpis fk">${fk(T("القروض الممنوحة"), M(t.issued), 'landmark', '', `${t.count} ${T("قرض")}`)}${fk(T("المسدد"), M(t.repaid), 'check', 'pos')}${fk(T("المتبقي"), M(t.outstanding), 'clock', 'warn')}${fk(T("الرصيد المتاح"), M(t.balance), 'wallet', 'accent')}</div>
    ${ben.rows.length ? `<div class="tbl-wrap"><table><thead><tr><th>${T("المستفيد")}</th><th>${T("الشهر")}</th><th>${T("مبلغ القرض")}</th><th>${T("المسدد")}</th><th>${T("المتبقي")}</th><th>${T("نسبة السداد")}</th><th>${T("الحالة")}</th>${manage ? '<th></th>' : ''}</tr></thead><tbody>
      ${ben.rows.map(l => `<tr class="${l.mine ? 'mine-row' : ''}"><td><b>${esc(l.name)}</b>${manage && l.anonymous ? ` <span class="badge muted" title="${T("يظهر للأعضاء كمجهول")}">★★★</span>` : ''}</td><td class="small">${monLabel(l.month)}</td>
        <td class="n"><b>${money(l.amount)}</b></td><td class="n">${money(l.paid)}</td><td class="n">${money(l.remaining)}</td>
        <td style="min-width:110px"><div class="cbar"><div class="progress"><i style="width:${Math.min(100, l.paid_pct)}%"></i></div><b class="num">${l.paid_pct}%</b></div></td>
        <td>${l.status === 'paid' ? `<span class="badge pos">${icon('check')}${T("تم السداد")}</span>` : `<span class="badge warn">${icon('clock')}${T("جارٍ السداد")}</span>`}</td>
        ${manage ? `<td class="row-acts"><button class="btn sm" data-le="${l.id}">${icon('edit')}</button></td>` : ''}</tr>`).join('')}</tbody></table></div>` : `<p class="muted small">${T("لا توجد قروض بعد")}</p>`}
  </section>`;
  el.innerHTML = mode === 'admin'
    ? `${pageHead('landmark', T("القروض"), T("قبول الطلبات ومعاينة القروض وجدول التحصيل"), manage ? `<button class="btn" id="bLoan">${icon('plus')}${T("تسجيل قرض مباشر")}</button>` : '')}${queue}${schedule}${register}`
    : `${pageHead('hand', T("طلب قرض"), T("اطلب قرضاً وتابع حالة طلبك وسجل المستفيدين"))}${myBox}${register}`;
  $('#bReq', el) && ($('#bReq', el).onclick = () => requestForm(d, reqs, reload));
  $$('[data-cancel]', el).forEach(b => b.onclick = async () => {
    if (!await confirmBox(T("إلغاء الطلب"), `<p>${T("إلغاء طلب القرض؟")}</p>`, T("إلغاء الطلب"), true)) return;
    try { await bapi(`/fund/requests/${b.dataset.cancel}/cancel`, { method: 'POST' }); toast(T("تم إلغاء الطلب"), 'ok'); reload(); } catch (e) { fail(e); }
  });
  $$('[data-appr]', el).forEach(b => b.onclick = () => approveForm(pend.find(r => r.id == b.dataset.appr), d, reload));
  $$('[data-rej]', el).forEach(b => b.onclick = () => {
    const md = modal(T("رفض الطلب"), `<form><label>${T("سبب الرفض")} <span class="opt">${T("(يراه العضو)")}</span><input name="note" maxlength="300"></label>
      <div class="mf"><button class="btn danger">${icon('x')}${T("رفض")}</button></div></form>`);
    $('form', md.el).onsubmit = (e) => { e.preventDefault(); busy(e.submitter, async () => { await bapi(`/fund/requests/${b.dataset.rej}/reject`, { method: 'POST', body: formObj(e.target) }); md.close(); toast(T("تم رفض الطلب"), 'ok'); reload(); }); };
  });
  if (manage) {
    $('#bLoan') && ($('#bLoan').onclick = () => loanForm(d, reload));
    $$('[data-le]', el).forEach(b => b.onclick = () => loanEdit(d.loans.find(l => l.id == b.dataset.le), reload));
  }
  $('#bLcsv').onclick = () => downloadCSV('loans', [[T("المستفيد"), T("الشهر"), T("مبلغ القرض"), T("المسدد"), T("المتبقي"), T("نسبة السداد"), T("الحالة")],
    ...ben.rows.map(l => [l.name, l.month, l.amount, l.paid, l.remaining, l.paid_pct + '%', l.status === 'paid' ? T("تم السداد") : T("جارٍ السداد")])]);
}
function requestForm(d, reqs, after) {
  const allowed = d.mine.filter(m => m.relation !== 'child' || m.guardian_act || d.full);
  if (!allowed.length) return toast(T("طلب قرض باسم الابن يحتاج موافقة المشرف على «التصرف باسمه»"), 'err');
  const opts = allowed.filter(m => !reqs.some(r => r.member_id === m.id && r.status === 'pending'));
  if (!opts.length) return toast(T("يوجد طلب قرض قيد المراجعة لهذا العضو"), 'err');
  const md = modal(T("تقديم طلب قرض"), `<form autocomplete="off">
    <label>${T("القرض باسم")}<select name="member_id" ${opts.length > 1 ? '' : 'disabled'}>${opt(opts, opts[0].id, m => [m.id, `${m.name}${m.relation === 'self' ? ' — ' + T("أنا") : ''} · ${T("الحد")} ${money(m.loan_limit)}`])}</select></label>
    ${opts.length > 1 ? '' : `<input type="hidden" name="member_id" value="${opts[0].id}">`}
    <p class="hint" style="margin-top:6px">${icon('info')}<span>${T("القرض وأقساطه يُسجّلان باسم من تختاره فقط، وحدّه يُحسب من مساهماته هو — لا تُجمع مساهمات الأب والأبناء")}.</span></p>
    <div class="fgrid"><label>${T("المبلغ المطلوب")}<input name="amount" type="number" step="1" min="1" inputmode="decimal" required></label>
      <label>${T("مدة السداد (بالأشهر)")}<input name="months" type="number" step="1" min="1" max="120" inputmode="numeric" required value="10"></label>
      <label class="full">${T("سبب الطلب")} <span class="opt">${T("(اختياري)")}</span><input name="reason" maxlength="300"></label></div>
    <div id="rqInfo"></div>
    <label class="check" style="margin:10px 0"><input type="checkbox" name="anonymous"> ${T("أريد إخفاء اسمي في سجل المستفيدين (يظهر ★★★ للأعضاء)")}</label>
    <p class="hint">${icon('info')}<span>${T("يصل طلبك للمشرف للموافقة أو الرفض، وتتابع حالته من هذه الصفحة")}.</span></p>
    <div class="mf"><button class="btn primary">${icon('check')}${T("إرسال الطلب")}</button></div></form>`);
  const f = $('form', md.el);
  const draw = () => {
    const m = d.mine.find(x => x.id == f.member_id.value);
    const amt = Number(f.amount.value) || 0, months = Number(f.months.value) || 0;
    const warn = [];
    const kid = m.relation === 'child';
    if (amt > m.loan_limit + 0.005) warn.push(`${kid ? T("المبلغ يتجاوز الحد المسموح له") : T("المبلغ يتجاوز الحد المسموح لك")} (${money(m.loan_limit)} = ${kid ? T("ضعف مساهماته") : T("ضعف مساهماتك")}). ${T("قد يُرفض الطلب أو يحتاج موافقة خاصة")}.`);
    if (m.flagged) warn.push(`${T("سجل السداد فيه تعثر")} (${flagText(m)})، ${T("وقد يكون ذلك سبباً في رفض الطلب")}.`);
    if (m.loans.some(l => l.status === 'active')) warn.push((kid ? T("عليه قرض قائم لم يُسدد بالكامل بعد") : T("عليك قرض قائم لم يُسدد بالكامل بعد")) + '.');
    $('#rqInfo', md.el).innerHTML = `<div class="summary-box"><div class="r"><span>${T("الحد المسموح")}</span><b>${money(m.loan_limit)}</b></div>
      ${amt && months ? `<div class="r"><span>${T("القسط الشهري التقريبي")}</span><b>${money(Math.ceil(amt / months))}</b></div>` : ''}</div>
      ${warn.map(w => `<div class="banner warn" style="margin:8px 0 0">${icon('alert')}<span class="grow">${w}</span></div>`).join('')}`;
  };
  f.addEventListener('input', draw); f.addEventListener('change', draw); draw();
  f.onsubmit = (e) => {
    e.preventDefault();
    busy(e.submitter, async () => {
      await bapi('/fund/requests', { method: 'POST', body: { ...formObj(f), anonymous: f.anonymous.checked } });
      md.close(); toast(T("تم إرسال الطلب، وسيصلك القرار هنا"), 'ok'); after();
    });
  };
}
function approveForm(r, d, after) {
  const over = r.amount > r.limit + 0.005;
  const md = modal(`${T("موافقة وصرف")} — ${r.member_name}`, `<form autocomplete="off">
    <div class="fgrid"><label>${T("مبلغ القرض")}<input name="amount" type="number" step="0.01" min="1" required value="${r.amount}"></label>
      <label>${T("القسط الشهري")}<input name="installment" type="number" step="0.01" min="1" required value="${Math.ceil(r.amount / r.months)}"></label>
      <label>${T("تاريخ الصرف")}<input name="issued_date" type="date" required value="${S.me.today}" max="${S.me.today}"></label>
      <label>${T("بداية الأقساط")}<input name="start_month" type="month" required value="${nextMon(d.now)}"></label>
      <label class="full">${T("ملاحظة للعضو")} <span class="opt">${T("(اختياري)")}</span><input name="note" maxlength="300"></label></div>
    <div class="io" id="apCalc"></div>
    <label class="check" id="apOver" ${over ? '' : 'hidden'} style="margin:10px 0"><input type="checkbox" name="override"> <b class="neg-t">${T("أوافق على تجاوز الحد المسموح لهذا العضو")} (${money(r.limit)})</b></label>
    <div class="mf"><button class="btn primary">${icon('check')}${T("موافقة وصرف")}</button></div></form>`);
  const f = $('form', md.el);
  const draw = () => {
    const a = Number(f.amount.value) || 0, i = Number(f.installment.value) || 0;
    $('#apOver', md.el).hidden = !(a > r.limit + 0.005);
    $('#apCalc', md.el).innerHTML = a && i ? `<div class="io-sec net"><div class="r"><span>${T("مدة السداد")}</span><b>${Math.ceil(a / i)} ${T("شهر")}</b></div>
      <div class="r"><span>${T("الرصيد بعد الصرف")}</span><b class="${a > r.balance ? 'neg-t' : ''}">${money(r.balance - a)}</b></div></div>` : '';
  };
  f.addEventListener('input', draw); draw();
  f.onsubmit = (e) => { e.preventDefault(); busy(e.submitter, async () => {
    await bapi(`/fund/requests/${r.id}/approve`, { method: 'POST', body: { ...formObj(f), override: f.override.checked } });
    md.close(); toast(T("تمت الموافقة وصرف القرض"), 'ok'); after();
  }); };
}

function loanForm(d, after) {
  const members = d.members.filter(m => !m.left_month);
  const mult = d.settings.loan_multiplier;
  const md = modal(T("تسجيل قرض"), `<form autocomplete="off">
    <div class="fgrid"><label class="full">${T("العضو")}<select name="member_id" required><option value="">—</option>${opt(members, '', m => [m.id, m.name])}</select></label></div>
    <div id="lInfo"></div>
    <div class="fgrid">
      <label>${T("مبلغ القرض")}<input name="amount" type="number" step="0.01" min="1" inputmode="decimal" required></label>
      <label>${T("القسط الشهري")}<input name="installment" type="number" step="0.01" min="1" inputmode="decimal" required></label>
      <label>${T("تاريخ الصرف")}<input name="issued_date" type="date" required value="${S.me.today}" max="${S.me.today}" title="${T("لقرض قديم اختر تاريخ صرفه الفعلي")}"></label>
      <label>${T("بداية الأقساط")}<input name="start_month" type="month" required value="${nextMon(d.now)}"></label>
      <label>${T("المسدد منه سابقاً")} <span class="opt">${T("(لقرض قديم قبل النظام)")}</span><input name="prepaid" type="number" step="0.01" min="0" inputmode="decimal" placeholder="0"></label>
      <label>${T("ملاحظة")} <span class="opt">${T("(اختياري)")}</span><input name="note"></label></div>
    <div class="io" id="lCalc"></div>
    <label class="check" style="margin:10px 0"><input type="checkbox" name="anonymous"> ${T("إخفاء اسم المستفيد عن الأعضاء (يظهر ★★★)")}</label>
    <label class="check" id="lOver" hidden style="margin:10px 0"><input type="checkbox" name="override"> <b class="neg-t">${T("أوافق على تجاوز الحد المسموح لهذا العضو")}</b></label>
    <div class="mf"><button class="btn primary">${icon('check')}${T("صرف القرض")}</button></div></form>`, { wide: true });
  const f = $('form', md.el);
  const draw = () => {
    const m = members.find(x => x.id == f.member_id.value);
    const limit = m ? Math.round(m.total_paid * mult * 100) / 100 : 0;
    const amt = Number(f.amount.value) || 0, inst = Number(f.installment.value) || 0;
    const loans = m ? d.loans.filter(l => l.member_id === m.id && l.status === 'active') : [];
    $('#lInfo', md.el).innerHTML = m ? `<div class="summary-box">
      <div class="r"><span>${T("مساهماته")}</span><b>${money(m.total_paid)}</b></div>
      <div class="r"><span>${T("الحد المسموح")} (${mult}×)</span><b>${money(limit)}</b></div>
      <div class="r"><span>${T("نسبة الالتزام")}</span><span>${pct(m.commitment)} ${ratingBadge(m.rating)}</span></div>
      <div class="r"><span>${T("رصيد الصندوق المتاح")}</span><b>${money(d.totals.balance)}</b></div>
      ${loans.length ? `<div class="r"><span class="neg-t">${T("عليه قرض قائم")}</span><b class="neg-t">${T("المتبقي")} ${money(loans.reduce((a, l) => a + l.remaining, 0))}</b></div>` : ''}
      ${m.flagged ? `<div class="r"><span class="neg-t">${icon('alert')}${T("متعثر")}: ${m.max_run >= 3 ? `${m.max_run} ${T("أشهر متتالية")}` : `${m.late_months} ${T("أشهر متفرقة")}`}</span></div>` : ''}</div>` : '';
    const over = m && amt > limit + 0.005;
    $('#lOver', md.el).hidden = !over;
    $('#lCalc', md.el).innerHTML = amt && inst ? `<div class="io-sec net"><div class="r"><span>${T("مدة السداد")}</span><b>${Math.ceil(amt / inst)} ${T("شهر")}</b></div>
      ${over ? `<div class="r"><span class="neg-t">${icon('alert')}${T("المبلغ يتجاوز الحد المسموح بـ")}</span><b class="neg-t">${money(amt - limit)}</b></div>` : ''}
      ${amt > d.totals.balance ? `<div class="r"><span class="neg-t">${T("رصيد الصندوق لا يكفي")}</span></div>` : ''}</div>` : '';
  };
  f.addEventListener('input', draw); f.addEventListener('change', draw); draw();
  f.onsubmit = (e) => {
    e.preventDefault();
    busy(e.submitter, async () => {
      await bapi('/fund/loans', { method: 'POST', body: { ...formObj(f), anonymous: f.anonymous.checked, override: f.override.checked } });
      md.close(); toast(T("تم تسجيل القرض"), 'ok'); after();
    });
  };
}
function loanEdit(l, after) {
  const md = modal(`${T("تعديل قرض")} — ${l.member_name}`, `<form>
    <div class="fgrid"><label>${T("القسط الشهري")}<input name="installment" type="number" step="0.01" min="1" required value="${l.installment}"></label>
    <label>${T("بداية الأقساط")}<input name="start_month" type="month" required value="${l.start_month}"></label>
    <label class="full">${T("ملاحظة")}<input name="note" value="${esc(l.note || '')}"></label></div>
    <label class="check" style="margin:10px 0"><input type="checkbox" name="anonymous" ${l.anonymous ? 'checked' : ''}> ${T("إخفاء اسم المستفيد عن الأعضاء (يظهر ★★★)")}</label>
    <div class="mf">${l.paid ? '' : `<button type="button" class="btn danger" id="bDelL">${icon('trash')}${T("حذف")}</button><span class="grow"></span>`}<button class="btn primary">${T("حفظ")}</button></div></form>`);
  const f = $('form', md.el);
  f.onsubmit = (e) => { e.preventDefault(); busy(e.submitter, async () => { await bapi('/fund/loans/' + l.id, { method: 'PUT', body: { ...formObj(f), anonymous: f.anonymous.checked } }); md.close(); toast(T("تم الحفظ"), 'ok'); after(); }); };
  const del = $('#bDelL', md.el);
  if (del) del.onclick = async () => {
    if (!await confirmBox(T("حذف قرض"), `<p>${T("حذف هذا القرض؟ يعود مبلغه لرصيد الصندوق")}.</p>`, T("حذف"), true)) return;
    try { await bapi('/fund/loans/' + l.id, { method: 'DELETE' }); md.close(); toast(T("تم الحذف"), 'ok'); after(); } catch (e) { fail(e); }
  };
}

/* ───────────── import the past from Excel (CSV) ───────────── */
// the sheet: one row per member — name, parent (optional), monthly dues (optional), then one column per month
const AR_MON = { 'يناير': 1, 'فبراير': 2, 'مارس': 3, 'أبريل': 4, 'ابريل': 4, 'مايو': 5, 'يونيو': 6, 'يوليو': 7, 'أغسطس': 8, 'اغسطس': 8, 'سبتمبر': 9, 'أكتوبر': 10, 'اكتوبر': 10, 'نوفمبر': 11, 'ديسمبر': 12 };
const EN_MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const digits = (s) => String(s ?? '').replace(/[٠-٩]/g, c => '٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/[۰-۹]/g, c => '۰۱۲۳۴۵۶۷۸۹'.indexOf(c));
function headerMonth(h) {
  const s = digits(h).trim();
  let m = s.match(/(\d{4})\s*[-/.]\s*(\d{1,2})(?!\d)/); if (m) return fmtYM(+m[1], +m[2]);
  m = s.match(/(?<!\d)(\d{1,2})\s*[-/.]\s*(\d{4})/); if (m) return fmtYM(+m[2], +m[1]);
  const y4 = s.match(/(\d{4})/), y2 = s.match(/(?<!\d)(\d{2})(?!\d)/);
  for (const [n, v] of Object.entries(AR_MON)) if (s.includes(n) && (y4 || y2)) return fmtYM(y4 ? +y4[1] : 2000 + +y2[1], v);
  const low = s.toLowerCase();
  for (const [n, v] of Object.entries(EN_MON)) if (low.includes(n) && (y4 || y2)) return fmtYM(y4 ? +y4[1] : 2000 + +y2[1], v);
  return null;
}
const fmtYM = (y, m) => y >= 2000 && y < 2100 && m >= 1 && m <= 12 ? `${y}-${String(m).padStart(2, '0')}` : null;
function parseCSV(text) {
  text = text.replace(/^﻿/, '');
  const first = text.split(/\r?\n/)[0] || '';
  const sep = [',', ';', '\t'].map(c => [c, first.split(c).length]).sort((a, b) => b[1] - a[1])[0][0];
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; continue; }
    if (c === '"') q = true; else if (c === sep) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(x => String(x).trim()));
}
const csvCell = (v) => /[",\n;]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
function downloadTemplate(d) {
  const months = [];
  for (let m = d.settings.start_month; m <= d.now && months.length < 600; m = nextMon(m)) months.push(m);
  const head = [T("الاسم"), T("الأب / الأم"), T("الاشتراك الشهري"), ...months.map(m => `${m} (${monName(m)})`)];
  const names = new Map(d.members.map(m => [m.id, m.name]));
  const lines = [head, ...d.members.filter(m => !m.deceased).map(m => [m.name, names.get(m.parent_id) || '', m.contributing ? m.monthly : '', ...months.map(() => '')])];
  const blob = new Blob(['﻿' + lines.map(r => r.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'fund-template.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
async function importFile(file, d, after) {
  const rows = parseCSV(await file.text());
  if (rows.length < 2) return toast(T("الملف فارغ أو غير مقروء"), 'err');
  const head = rows[0].map(h => String(h).trim());
  const col = (...names) => head.findIndex(h => names.some(n => h.includes(n)));
  const cName = Math.max(0, col('الاسم', 'Name', 'name'));
  const cParent = col('الأب', 'الام', 'الأم', 'Parent', 'parent');
  const cMonthly = col('الاشتراك', 'المعتاد', 'Monthly', 'monthly');
  const monthCols = head.map((h, i) => [i, i === cName || i === cParent || i === cMonthly ? null : headerMonth(h)]).filter(([, m]) => m);
  if (!monthCols.length) return toast(T("لم أجد أعمدة أشهر — استخدم القالب، أو اجعل عنوان كل عمود مثل 2024-12"), 'err');
  const num = (v) => { const n = Number(digits(v).replace(/[,\s]/g, '').replace('٫', '.')); return Number.isFinite(n) ? n : 0; };
  const data = rows.slice(1).map(r => ({
    name: String(r[cName] || '').trim(), parent: cParent >= 0 ? String(r[cParent] || '').trim() : '',
    monthly: cMonthly >= 0 && String(r[cMonthly] || '').trim() !== '' ? num(r[cMonthly]) : null,
    payments: Object.fromEntries(monthCols.map(([i, m]) => [m, num(r[i])]).filter(([m, a]) => a > 0 && m <= d.now)),
  })).filter(r => r.name && !/^(المجموع|الإجمالي|مجموع|total)/i.test(r.name));
  const existing = new Set(d.members.map(m => m.name));
  const fresh = data.filter(r => !existing.has(r.name));
  const count = data.reduce((a, r) => a + Object.keys(r.payments).length, 0), total = data.reduce((a, r) => a + Object.values(r.payments).reduce((x, y) => x + y, 0), 0);
  const ms = monthCols.map(c => c[1]).sort();
  const early = ms[0] < d.settings.start_month;
  const md = modal(T("مراجعة الاستيراد"), `<div class="summary-box">
      <div class="r"><span>${T("الأعضاء في الملف")}</span><b>${data.length}</b></div>
      <div class="r"><span>${T("أعضاء جدد سيُضافون")}</span><b>${fresh.length}</b></div>
      <div class="r"><span>${T("الأشهر")}</span><b>${monLabel(ms[0])} – ${monLabel(ms[ms.length - 1])}</b></div>
      <div class="r"><span>${T("عدد الدفعات")}</span><b>${count}</b></div>
      <div class="r t"><span>${T("مجموع المبالغ")}</span><b>${money(total)}</b></div></div>
    ${fresh.length ? `<p class="small"><b>${T("جدد")}:</b> ${fresh.slice(0, 30).map(r => esc(r.name)).join('، ')}${fresh.length > 30 ? ' …' : ''}</p>` : ''}
    ${early ? `<div class="banner warn">${icon('alert')}<span class="grow">${T("الملف يبدأ قبل «بداية الصندوق» في الإعدادات")} (${monLabel(d.settings.start_month)}). ${T("غيّر بداية الصندوق إلى")} ${monLabel(ms[0])} ${T("أولاً، وإلا ستُرفض الأشهر الأقدم")}.</span></div>` : ''}
    <label class="check" style="margin:10px 0"><input type="checkbox" id="impRep" checked> ${T("استبدال دفعات الاشتراك الموجودة في نفس الأشهر (لتجنب التكرار عند إعادة الاستيراد)")}</label>
    <p class="hint">${icon('info')}<span>${T("الأعضاء الجدد يُضافون بالاشتراك المكتوب في عمود «الاشتراك الشهري»، أو بالمبلغ الأكثر تكراراً في دفعاتهم. يمكنك تعديل المبلغ وتغييره من شهر معين لاحقاً")}.</span></p>
    <div class="mf"><button class="btn primary" id="impGo" ${early ? 'disabled' : ''}>${icon('download')}${T("استيراد")}</button></div>`, { wide: true });
  $('#impGo', md.el).onclick = (e) => busy(e.currentTarget, async () => {
    const r = await bapi('/fund/import', { method: 'POST', body: { rows: data, replace: $('#impRep', md.el).checked } });
    md.close();
    toast(`${T("تم الاستيراد")}: ${r.payments} ${T("دفعة")} — ${money(r.total)}${r.created ? ` · ${r.created} ${T("عضو جديد")}` : ''}`, 'ok');
    after();
  });
}

/* ───────────── fund settings ───────────── */
VIEWS.fsettings = async (el) => {
  await loadMeta();
  const d = await bapi('/fund/overview');
  const s = d.settings, b = S.meta.business;
  el.innerHTML = `${pageHead('sliders', T("إعدادات الصندوق"), esc(T(s.name)))}
  <section class="card"><h3>${T("شعار الصندوق")}</h3><div id="logoBox" class="logo-box">
    <div class="logo-prev">${logoURL(b) ? `<img src="${logoURL(b)}" alt="">` : `<span class="muted small">${T("لا يوجد شعار")}</span>`}</div>
    <div><div class="row"><label class="btn primary sm">${icon('image')}${logoURL(b) ? T("تغيير الشعار") : T("رفع شعار")}<input type="file" accept="image/png,image/jpeg,image/webp" hidden data-logo-file></label>
    ${logoURL(b) ? `<button type="button" class="btn sm" data-logo-edit="${logoURL(b)}">${icon('edit')}${T("تعديل الصورة")}</button><button type="button" class="btn sm danger" data-logo-del>${T("حذف الشعار")}</button>` : ''}</div></div></div></section>
  <section class="card"><h3>${icon('eye')}${T("الشفافية والخصوصية")}</h3><form id="fPriv">
    <label class="check"><input type="checkbox" name="show_names" ${s.show_names ? 'checked' : ''}> <span><b>${T("إظهار أسماء الأعضاء ومساهماتهم والتزامهم للجميع في «تقرير الصندوق»")}</b>
      <small class="muted" style="display:block">${T("إذا لم يُفعّل: يرى كل عضو الأرقام والنسب كاملة، وأسماء غيره تظهر «عضو 1، عضو 2…»، ويستطيع طلب عرضها منكم")}</small></span></label>
    <label class="check" style="margin-top:10px"><input type="checkbox" name="show_borrowers" ${s.show_borrowers ? 'checked' : ''}> <span><b>${T("إظهار أسماء المقترضين للجميع")}</b>
      <small class="muted" style="display:block">${T("حتى من طلب إخفاء اسمه — حتى يعلم الجميع أن الاستفادة عامة")}</small></span></label>
    <div class="mf" style="margin-top:10px"><button class="btn primary sm">${T("حفظ")}</button></div></form></section>
  <section class="card" id="banCard"></section>
  <section class="card"><h3>${icon('fileText')}${T("الكشف الشهري التلقائي")}</h3>
    <p class="small">${T("في أول كل شهر يصل لكل عضو له حساب تنبيه بكشف حسابه للشهر الماضي: ما دفعه، والمتأخرات، ونسبة التزامه، مع رابط للكشف كاملاً قابلاً للطباعة. العضو الذي ليس له حساب يصل كشفه لوالده إذا كان يتابعه")}.</p>
    <div class="row"><span class="grow small muted">${T("آخر إرسال")}: <b>${s.statement_month ? monLabel(s.statement_month) : T("لم يُرسل بعد")}</b></span>
      <button class="btn sm" id="bStSend">${icon('bell')}${T("إرسال كشوفات")} ${monLabel(prevMon(d.now))} ${T("الآن")}</button></div></section>
  <section class="card"><h3>${T("الإعدادات العامة")}</h3><form id="fFS" class="fgrid">
    <label class="full">${T("اسم الصندوق")}<input name="name" required maxlength="100" value="${esc(T(s.name))}"></label>
    <label class="full">${T("عبارة الصندوق")} <span class="opt">${T("(تظهر في «أثر الصندوق» والإيصالات والكشوفات)")}</span><input name="motto" maxlength="200" value="${esc(s.motto || '')}" placeholder="${DEFAULT_MOTTO}"></label>
    <label>${T("بداية الصندوق (أول شهر)")}<input name="start_month" type="month" required value="${s.start_month}"></label>
    <label>${T("موعد الدفع (يوم من كل شهر)")}<input name="due_day" type="number" min="1" max="28" value="${s.due_day}"></label>
    <label>${T("حد القرض = مساهمات العضو ×")}<input name="loan_multiplier" type="number" step="0.5" min="0.5" value="${s.loan_multiplier}"></label>
    <label>${T("رصيد افتتاحي")} <span class="opt">${T("(مبلغ موجود قبل استخدام النظام)")}</span><input name="opening_balance" type="number" step="0.01" value="${s.opening_balance}"></label>
    <div style="align-self:end"><button class="btn primary">${T("حفظ")}</button></div></form>
    <p class="hint">${icon('info')}<span>${T("يُعتبر الشهر متعثراً إذا انتهى دون دفع كامل المطلوب. عند طلب قرض يظهر تنبيه لمن تعثّر 3 أشهر متتالية أو 5 أشهر متفرقة")}.</span></p></section>
  <section class="card"><div class="card-head"><h3>${icon('coins')}${T("فئات الاشتراك")}</h3><button class="btn sm primary" id="bCat">${icon('plus')}${T("إضافة فئة")}</button></div>
    <div class="tbl-wrap"><table><tbody>${d.categories.map(c => `<tr class="${c.active ? '' : 'hidden-row'}"><td><b>${esc(T(c.name))}</b></td><td class="n">${money(c.amount)} / ${T("شهر")}</td><td>${d.members.filter(m => m.category_id === c.id && m.contributing && !m.left_month).length} ${T("عضو")}</td>
      <td class="row-acts"><button class="btn sm" data-cat="${c.id}">${icon('edit')}${T("تعديل")}</button></td></tr>`).join('')}</tbody></table></div>
    <p class="hint">${icon('info')}<span>${T("تغيير مبلغ الفئة يُطبّق على كل أعضائها من الشهر الذي تختاره، والأشهر السابقة تبقى كما هي. لعضو بمبلغ مختلف استخدم «تغيير المبلغ» من صفحة العضو")}.</span></p></section>
  <section class="card"><h3>${icon('download')}${T("استيراد البيانات السابقة من Excel")}</h3>
    <ol class="steps small">
      <li>${T("تأكد أن «بداية الصندوق» أعلاه هي أول شهر في سجلك القديم")}.</li>
      <li>${T("نزّل القالب: فيه عمود لكل شهر من بداية الصندوق حتى الآن، وأسماء الأعضاء الحاليين")}.</li>
      <li>${T("افتحه في Excel، والصق المبالغ المدفوعة من ملفك القديم (اسم العضو في أول عمود، ومبلغ كل شهر تحت شهره). أضف أي عضو غير موجود في صف جديد")}.</li>
      <li>${T("احفظه بصيغة CSV UTF-8، ثم ارفعه هنا وراجع الملخص قبل الاستيراد")}.</li>
    </ol>
    <div class="row"><button class="btn" id="bTpl">${icon('download')}${T("تنزيل القالب")}</button>
      <label class="btn primary">${icon('fileText')}${T("رفع الملف")}<input type="file" accept=".csv,text/csv" hidden id="impFile"></label></div>
    <p class="hint">${icon('info')}<span>${T("القروض القديمة: سجّلها من صفحة «القروض» بتاريخ صرفها الفعلي، واكتب ما سُدد منها في خانة «المسدد منه سابقاً»")}.</span></p></section>`;
  bindLogoBox($('#logoBox'), () => VIEWS.fsettings(el));
  bannersCard($('#banCard')).catch(fail);
  $('#fPriv').onsubmit = (e) => { e.preventDefault(); busy(e.submitter, async () => {
    await bapi('/fund/settings', { method: 'PUT', body: { show_names: e.target.show_names.checked, show_borrowers: e.target.show_borrowers.checked } });
    toast(T("تم الحفظ"), 'ok');
  }); };
  $('#bTpl').onclick = () => downloadTemplate(d);
  $('#bStSend').onclick = (e) => busy(e.currentTarget, async () => {
    if (!await confirmBox(T("إرسال الكشوفات"), `<p>${T("إرسال كشف")} ${monLabel(prevMon(d.now))} ${T("لكل الأعضاء الآن؟ من وصله الكشف سابقاً سيصله مرة أخرى")}.</p>`, T("إرسال"))) return;
    const r = await bapi('/fund/statements/send', { method: 'POST' });
    toast(`${T("تم إرسال")} ${r.sent} ${T("كشف")}`, 'ok'); VIEWS.fsettings(el);
  });
  $('#impFile').onchange = async (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) try { await importFile(f, d, () => VIEWS.fsettings(el)); } catch (err) { fail(err); } };
  $('#fFS').onsubmit = (e) => { e.preventDefault(); busy(e.submitter, async () => { await bapi('/fund/settings', { method: 'PUT', body: formObj(e.target) }); toast(T("تم الحفظ"), 'ok'); await refreshBusinesses(); VIEWS.fsettings(el); }); };
  const catForm = (c) => {
    const md = modal(c ? T("تعديل فئة") : T("فئة جديدة"), `<form><div class="fgrid">
      <label>${T("الاسم")}<input name="name" required value="${esc(c ? T(c.name) : '')}"></label>
      <label>${T("المبلغ الشهري")}<input name="amount" type="number" step="0.01" min="0" required value="${c ? c.amount : ''}"></label>
      ${c ? `<label>${T("يُطبّق المبلغ الجديد من شهر")}<input name="apply_from" type="month" value="${d.now}"></label>` : ''}</div>
      ${c ? `<label class="check" style="margin-top:10px"><input type="checkbox" name="active" ${c.active ? 'checked' : ''}> ${T("ظاهرة عند إضافة عضو")}</label>` : ''}
      <div class="mf"><button class="btn primary">${T("حفظ")}</button></div></form>`);
    const f = $('form', md.el);
    f.onsubmit = (e) => { e.preventDefault(); busy(e.submitter, async () => {
      const body = formObj(f); if (c) body.active = f.active.checked;
      const r = c ? await bapi('/fund/categories/' + c.id, { method: 'PUT', body }) : await bapi('/fund/categories', { method: 'POST', body });
      md.close(); toast(r.applied ? `${T("تم تطبيق المبلغ على")} ${r.applied} ${T("عضو")}` : T("تم الحفظ"), 'ok'); VIEWS.fsettings(el);
    }); };
  };
  $('#bCat').onclick = () => catForm(null);
  $$('[data-cat]', el).forEach(x => x.onclick = () => catForm(d.categories.find(c => c.id == x.dataset.cat)));
};

/* ═════════ warm pages: the impact of the fund + family goals, receipts, monthly statement ═════════ */
Object.assign(ICONS, {
  heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  sprout: '<path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/>',
});
NAV.splice(NAV.findIndex(n => n[0] === 'collect'), 0, ['impact', T("أثر الصندوق"), () => isFund(), 'heart', 'fund']);
EXTRA_ROUTES.receipt = () => isFund();
EXTRA_ROUTES.statement = () => isFund();

const DEFAULT_MOTTO = 'وَتَعَاوَنُوا عَلَى الْبِرِّ وَالتَّقْوَى';
const GOAL_COLORS = { sunset: T("برتقالي دافئ"), rose: T("وردي"), gold: T("ذهبي"), forest: T("أخضر"), ocean: T("أزرق"), brand: T("لون النظام") };
const GOAL_KINDS = {
  campaign: [T("حملة مساهمات"), T("تُسجَّل لها مساهمات خاصة، منفصلة عن رصيد الصندوق")],
  balance: [T("رصيد الصندوق"), T("يتقدم تلقائياً مع الرصيد المتاح")],
  collected: [T("إجمالي التجميع"), T("يتقدم تلقائياً مع كل اشتراك")],
  members: [T("عدد المساهمين"), T("يتقدم تلقائياً مع انضمام المساهمين")],
};
const GOAL_EMOJI = ['🎯', '🤝', '💍', '🎓', '🏠', '🕌', '🌱', '❤️', '🌙', '🎁', '🩺', '👶'];
const goalVal = (g, v) => g.kind === 'members' ? String(v) : money(v);
const daysLeft = (d) => Math.round((new Date(d + 'T00:00:00') - new Date(S.me.today + 'T00:00:00')) / 864e5);
const fundLogo = () => { const u = logoURL(curBiz()); return u ? `<img src="${u}" alt="">` : icon('heart'); };
const mottoOf = (x) => esc(x.motto || DEFAULT_MOTTO);
const ring = (v, size = '') => {
  const p = Math.max(0, Math.min(100, v ?? 0)), r = 42, C = 2 * Math.PI * r;
  return `<svg viewBox="0 0 100 100" class="iring ${size}" role="img" aria-label="${v ?? '—'}%"><circle cx="50" cy="50" r="${r}" class="ir-bg"/>
    <circle cx="50" cy="50" r="${r}" class="ir-fg" stroke-dasharray="${(C * p / 100).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 50 50)"/>
    <text x="50" y="57" text-anchor="middle">${v === null || v === undefined ? '—' : v + '%'}</text></svg>`;
};

/* ───────────── «أثر الصندوق» ───────────── */
// the owner can reword the page and change its look; an empty text falls back to these defaults
const IMPACT_THEMES = { warm: T("دافئ"), brand: T("لون النظام"), ocean: T("أزرق"), forest: T("أخضر"), rose: T("وردي"), gold: T("ذهبي"), night: T("ليلي") };
const IMPACT_DEF = {
  kicker: T("أثر الصندوق"), since: T("شهراً من العطاء"), wafa_title: T("نسبة الوفاء"),
  wafa_text: T("هذه نسبة ما سُدد من الاشتراكات المستحقة منذ البداية — وفاؤكم هو ما يجعل الصندوق جاهزاً حين يحتاجه أحد"),
  s_collected: T("جمعناه معاً"), s_loans: T("قروض حسنة لأفراد العائلة"), s_repaid: T("أُعيد للصندوق بأمانة"), s_members: T("فرداً في شجرة العائلة"),
  s_balance: T("جاهز اليوم لمن يحتاج"), s_last: '', goals_title: T("أهداف العائلة"), journey_title: T("رحلتنا عاماً بعد عام"),
  footer: T("كل ريال في هذا الصندوق يدٌ ممدودة لأحد أفراد العائلة. شكراً لكل من التزم وساهم وكان سبباً في هذا الخير"),
};
const IMPACT_FIELDS = [['kicker', T("الشارة أعلى الصفحة")], ['title', T("العنوان الرئيسي")], ['since', T("نص المدة (بعد عدد الأشهر)")], ['wafa_title', T("عنوان نسبة الوفاء")], ['wafa_text', T("شرح نسبة الوفاء"), 1],
  ['s_collected', T("خانة: ما جمعناه")], ['s_loans', T("خانة: القروض")], ['s_repaid', T("خانة: ما أُعيد")], ['s_members', T("خانة: أفراد الشجرة")], ['s_balance', T("خانة: الرصيد الجاهز")], ['s_last', T("الخانة الأخيرة")],
  ['goals_title', T("عنوان الأهداف")], ['journey_title', T("عنوان الرحلة")], ['footer', T("الكلمة الختامية"), 1]];
const IMPACT_SECTIONS = { wafa: T("نسبة الوفاء"), stats: T("خانات الأرقام"), goals: T("أهداف العائلة"), journey: T("رحلتنا عاماً بعد عام"), footer: T("الكلمة الختامية") };
VIEWS.impact = async (el) => {
  const d = await bapi('/fund/impact');
  draw(d.page || {});
  function draw(cfg) {
  const tx = (k, dflt) => esc((cfg.texts || {})[k] || dflt || IMPACT_DEF[k] || '');
  const shown = (k) => !(cfg.hide || []).includes(k);
  const im = cfg.img || {};
  const t = d.totals, f = d.family;
  const canGift = can('fund_collect') || can('fund_manage');
  const stat = (ic, value, label, sub = '') => `<div class="istat"><div class="is-ic">${icon(ic)}</div><b class="num">${value}</b><span>${label}</span>${sub ? `<small>${sub}</small>` : ''}</div>`;
  const goals = d.goals;
  const goalCard = (g) => {
    const dl = g.deadline && !g.done ? daysLeft(g.deadline) : null;
    return `<article class="goal g-${g.color} ${g.done ? 'done' : ''} ${g.active ? '' : 'off'}">
      <div class="g-top"><div class="g-emoji">${esc(g.emoji || '🎯')}</div>
        <div class="grow"><h4>${esc(g.title)}</h4><small>${GOAL_KINDS[g.kind]?.[0] || ''}${dl !== null ? ` · ${dl > 0 ? `${T("باقي")} ${dl} ${T("يوماً")}` : dl === 0 ? T("آخر يوم") : `${T("انتهى في")} ${g.deadline}`}` : ''}</small></div>
        ${g.done ? `<span class="badge pos">${icon('check')}${T("تحقق بفضل الله")} 🎉</span>` : g.active ? '' : `<span class="badge muted">${T("مخفي")}</span>`}</div>
      ${g.description ? `<p class="g-desc">${esc(g.description)}</p>` : ''}
      <div class="g-prog"><div class="gbar"><i style="width:${g.pct}%"></i></div>
        <div class="row small"><b class="num">${goalVal(g, g.progress)}</b><span class="muted">${T("من")} <span class="num">${goalVal(g, g.target)}</span></span><span class="grow"></span><b class="num">${g.pct}%</b></div></div>
      ${g.kind === 'campaign' ? `<div class="small muted">${icon('users')} ${g.givers} ${T("مساهم")}${g.mine ? ` · ${T("مساهمتكم")} <b class="num">${money(g.mine)}</b> 💛` : ''}</div>` : ''}
      ${d.manage || (canGift && g.kind === 'campaign') ? `<div class="row g-acts no-print">
        ${canGift && g.kind === 'campaign' && !g.done ? `<button class="btn sm primary" data-gift="${g.id}">${icon('gift')}${T("تسجيل مساهمة")}</button>` : ''}
        ${g.kind === 'campaign' && (can('fund_view_all') || d.manage) ? `<button class="btn sm" data-gifts="${g.id}">${icon('list')}${T("المساهمات")}</button>` : ''}
        <span class="grow"></span>${d.manage ? `<button class="btn sm" data-goal="${g.id}">${icon('edit')}${T("تعديل")}</button>` : ''}</div>` : ''}
    </article>`;
  };
  const yrs = [...d.years].reverse();
  el.innerHTML = `<div class="impact th-${esc(cfg.theme || 'warm')}">
    <section class="ihero sz-${esc(cfg.size || 'm')} ${cfg.image ? 'has-img' : ''}" style="--shade:${(im.shade ?? 45) / 100}">
      ${cfg.image ? `<img class="ih-img" src="${esc(cfg.image)}" alt="" draggable="false" style="object-position:${im.x ?? 50}% ${im.y ?? 50}%;transform:scale(${(im.zoom ?? 100) / 100});transform-origin:${im.x ?? 50}% ${im.y ?? 50}%">` : ''}
      <div class="ih-logo">${fundLogo()}</div>
      <div class="ih-t"><span class="ih-k">${icon('heart')}${tx('kicker')}</span><h1>${tx('title', T(d.name))}</h1>
        <p class="ih-motto">«${mottoOf(d)}»</p>
        <p class="ih-since">${icon('sprout')}${T("معاً منذ")} ${monLabel(d.start_month)} · <b class="num">${d.months}</b> ${tx('since')}</p></div>
      <div class="ih-btns no-print">${d.manage ? `<button class="btn sm" id="bPage">${icon('edit')}${T("تعديل الصفحة")}</button>` : ''}<button class="btn sm" onclick="print()">${icon('printer')}</button></div>
    </section>
    ${shown('wafa') || shown('stats') ? `<div class="iwrap">
      ${shown('wafa') ? `<section class="card iwafa"><div>${ring(t.collection_rate)}</div><div class="grow">
        <h3>${tx('wafa_title')}</h3>
        <p>${tx('wafa_text')}${(cfg.texts || {}).wafa_text ? '' : '.'}</p>
        ${d.closed_months ? `<p class="small"><b class="num">${d.full_months}</b> ${T("شهراً التزم فيها الجميع دون استثناء، من أصل")} <b class="num">${d.closed_months}</b> 🌟</p>` : ''}</div></section>` : ''}
      ${shown('stats') ? `<div class="istats">
        ${stat('coins', money(t.collected), tx('s_collected'))}
        ${stat('hand', money(t.loans_issued), tx('s_loans'), `${t.loans_count} ${T("قرضاً")} · ${f.borrowers} ${T("مستفيداً")}`)}
        ${stat('check', money(t.repaid), tx('s_repaid'))}
        ${stat('users', f.members, tx('s_members'), f.generations > 1 ? `${f.generations} ${T("أجيال")}` : '')}
        ${stat('wallet', money(t.balance), tx('s_balance'))}
        ${d.gifts_total ? stat('gift', money(d.gifts_total), tx('s_last', T("لحملات الخير"))) : stat('heart', t.contributors, tx('s_last', T("يساهمون كل شهر")))}
      </div>` : ''}
    </div>` : ''}
    ${shown('goals') ? `<section class="card"><div class="card-head"><h3>${icon('target')}${tx('goals_title')}</h3>${d.manage ? `<button class="btn sm primary no-print" id="bGoal">${icon('plus')}${T("هدف جديد")}</button>` : ''}</div>
      ${goals.length ? `<div class="goals">${goals.map(goalCard).join('')}</div>`
        : `<div class="empty small">${icon('sprout')} ${d.manage ? T("لا توجد أهداف بعد — أضف هدفاً تجتمع عليه العائلة: زواج، تعليم، علاج، أو رصيد تطمئنون به") : T("لا توجد أهداف معلنة بعد")}</div>`}
    </section>` : ''}
    ${yrs.length && shown('journey') ? `<section class="card"><h3>${icon('history')}${tx('journey_title')}</h3><div class="journey">
      ${yrs.map(y => `<div class="jy"><div class="jy-dot num">${y.year}</div><div class="jy-b">
        <span>${icon('coins')}${T("جمعنا")} <b class="num">${money(y.collected)}</b></span>
        ${y.loans ? `<span>${icon('hand')}${y.loans} ${T("قرضاً بـ")} <b class="num">${money(y.lent)}</b></span>` : ''}
        ${y.repaid ? `<span>${icon('check')}${T("سُدد")} <b class="num">${money(y.repaid)}</b></span>` : ''}
        ${y.joined ? `<span>${icon('sprout')}${T("انضم")} <b>${y.joined}</b></span>` : ''}
        ${y.gifts ? `<span>${icon('gift')}${T("للحملات")} <b class="num">${money(y.gifts)}</b></span>` : ''}</div></div>`).join('')}
    </div></section>` : ''}
    ${shown('footer') ? `<section class="ifoot">${icon('heart')}<p>${tx('footer')}${(cfg.texts || {}).footer ? '' : '.'}</p></section>` : ''}</div>`;
  const reload = () => VIEWS.impact(el);
  const pb = $('#bPage', el); if (pb) pb.onclick = () => impactEditor(d, cfg, draw, reload);
  const byId = (id) => goals.find(g => g.id === Number(id));
  const add = $('#bGoal'); if (add) add.onclick = () => goalForm(null, reload);
  $$('[data-goal]', el).forEach(b => b.onclick = () => goalForm(byId(b.dataset.goal), reload));
  $$('[data-gift]', el).forEach(b => b.onclick = () => giftForm(byId(b.dataset.gift), reload).catch(fail));
  $$('[data-gifts]', el).forEach(b => b.onclick = () => giftsList(byId(b.dataset.gifts), reload).catch(fail));
  }
};
// the owner's editor: texts / design / sections — the page behind shows every change at once
function impactEditor(d, saved, draw, reload) {
  const c = JSON.parse(JSON.stringify(saved || {}));
  c.texts = c.texts || {}; c.hide = c.hide || []; c.img = c.img || { x: 50, y: 50, zoom: 100, shade: 45 };
  const md = modal(T("تعديل صفحة أثر الصندوق"), `<form autocomplete="off" class="ied-page">
    <div class="seg full-seg" style="margin-bottom:12px">${[['t', T("النصوص")], ['d', T("التصميم")], ['s', T("الأقسام")]].map(([k, l], i) => `<label><input type="radio" name="tab" value="${k}" ${i ? '' : 'checked'}><span>${l}</span></label>`).join('')}</div>
    <div data-pane="t">
      <p class="hint">${icon('info')}<span>${T("اترك الخانة فارغة ليبقى النص الأصلي (يظهر باهتاً داخلها)")}.</span></p>
      <div class="fgrid">${IMPACT_FIELDS.map(([k, l, big]) => `<label class="${big ? 'full' : ''}">${l}${big ? `<textarea data-t="${k}" rows="3" placeholder="${esc(IMPACT_DEF[k])}">${esc(c.texts[k] || '')}</textarea>` : `<input data-t="${k}" placeholder="${esc(k === 'title' ? T(d.name) : IMPACT_DEF[k] || T("حسب الحالة"))}" value="${esc(c.texts[k] || '')}">`}</label>`).join('')}
        <label class="full">${T("العبارة تحت العنوان")} <span class="opt">${T("(تظهر أيضاً في الإيصالات والكشوفات)")}</span><input name="motto" maxlength="200" value="${esc(d.motto || '')}" placeholder="${esc(DEFAULT_MOTTO)}"></label></div></div>
    <div data-pane="d" hidden>
      <div class="sec-title">${T("ألوان الصفحة")}</div>
      <div class="ban-colors">${Object.entries(IMPACT_THEMES).map(([k, l]) => `<label class="bc"><input type="radio" name="theme" value="${k}" ${(c.theme || 'warm') === k ? 'checked' : ''}><span class="fb-slide th-sw th-${k} on"></span><small>${l}</small></label>`).join('')}</div>
      <div class="sec-title" style="margin-top:12px">${T("حجم رأس الصفحة")}</div>
      <div class="seg">${[['s', T("صغير")], ['m', T("متوسط")], ['l', T("كبير")]].map(([k, l]) => `<label><input type="radio" name="size" value="${k}" ${(c.size || 'm') === k ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>
      <div class="sec-title" style="margin-top:12px">${T("صورة خلفية لرأس الصفحة")}</div>
      <div class="row"><label class="btn sm">${icon('image')}<span id="ipImgL"></span><input type="file" accept="image/png,image/jpeg,image/webp" hidden id="ipImg"></label><button type="button" class="btn sm ghost" id="ipNoImg">${T("بدون صورة")}</button></div>
      <div id="ipCtl" class="ban-ctl">
        <p class="small muted" style="margin:0">${icon('info')} ${T("اسحب الصورة في المعاينة لتحريكها")}</p>
        <div id="ipPrev" class="ip-prev"></div>
        <label>${T("تكبير الصورة")}<input type="range" name="zoom" min="100" max="300" step="5" value="${c.img.zoom}"></label>
        <label>${T("تعتيم الصورة (لوضوح الكتابة)")}<input type="range" name="shade" min="0" max="90" step="5" value="${c.img.shade}"></label></div></div>
    <div data-pane="s" hidden>
      <p class="muted small">${T("اختر الأقسام التي تظهر في الصفحة")}</p>
      ${Object.entries(IMPACT_SECTIONS).map(([k, l]) => `<label class="check"><input type="checkbox" data-sh="${k}" ${c.hide.includes(k) ? '' : 'checked'}> ${l}</label>`).join('')}</div>
    <div class="mf"><button type="button" class="btn ghost" id="ipReset">${icon('undo')}${T("استعادة الأصل")}</button><span class="grow"></span><button class="btn primary">${icon('check')}${T("حفظ")}</button></div></form>`, { wide: true });
  const f = $('form', md.el);
  let saving = false;
  const read = () => {
    for (const i of $$('[data-t]', f)) { if (i.value.trim()) c.texts[i.dataset.t] = i.value.trim(); else delete c.texts[i.dataset.t]; }
    c.theme = f.theme.value; c.size = f.size.value;
    c.hide = $$('[data-sh]', f).filter(i => !i.checked).map(i => i.dataset.sh);
    c.img.zoom = Number(f.zoom.value); c.img.shade = Number(f.shade.value);
  };
  const preview = () => {
    read(); draw({ ...c, img: c.img });
    $('#ipCtl', md.el).hidden = !c.image; $('#ipNoImg', md.el).hidden = !c.image;
    $('#ipImgL', md.el).textContent = c.image ? T("تغيير الصورة") : T("اختيار صورة");
    $('#ipPrev', md.el).innerHTML = c.image ? `<div class="ihero sz-s has-img impact th-${esc(c.theme)}" style="--shade:${c.img.shade / 100}"><img class="ih-img" src="${esc(c.image)}" alt="" draggable="false" style="object-position:${c.img.x}% ${c.img.y}%;transform:scale(${c.img.zoom / 100});transform-origin:${c.img.x}% ${c.img.y}%"><div class="ih-t"><h1>${esc(c.texts.title || T(d.name))}</h1></div></div>` : '';
  };
  f.addEventListener('input', preview); f.addEventListener('change', preview);
  $$('[name=tab]', f).forEach(r => r.onchange = () => $$('[data-pane]', f).forEach(p => { p.hidden = p.dataset.pane !== f.tab.value; }));
  $('#ipImg', md.el).onchange = async (e) => { const file = e.target.files[0]; e.target.value = ''; if (!file) return; try { c.image = await bannerImage(file); c.img = { x: 50, y: 50, zoom: 100, shade: Number(f.shade.value) }; f.zoom.value = 100; preview(); } catch (err) { fail(err); } };
  $('#ipNoImg', md.el).onclick = () => { delete c.image; preview(); };
  const pv = $('#ipPrev', md.el); let dg = null;
  pv.addEventListener('pointerdown', (e) => { if (!c.image) return; const r = pv.getBoundingClientRect(); dg = { sx: e.clientX, sy: e.clientY, x: c.img.x, y: c.img.y, w: r.width, h: r.height }; pv.setPointerCapture(e.pointerId); e.preventDefault(); });
  pv.addEventListener('pointermove', (e) => { if (!dg) return; const k = 100 / (c.img.zoom / 100);
    c.img.x = Math.round(Math.min(100, Math.max(0, dg.x - (e.clientX - dg.sx) / dg.w * k))); c.img.y = Math.round(Math.min(100, Math.max(0, dg.y - (e.clientY - dg.sy) / dg.h * k))); preview(); });
  const stop = () => { dg = null; }; pv.addEventListener('pointerup', stop); pv.addEventListener('pointercancel', stop);
  $('#ipReset', md.el).onclick = async () => {
    if (!await confirmBox(T("استعادة الأصل"), `<p>${T("ترجع النصوص والألوان والأقسام كما كانت في الأصل. متابعة؟")}</p>`, T("استعادة"))) return;
    busy($('#ipReset', md.el), async () => { await bapi('/fund/impact-page', { method: 'PUT', body: {} }); saving = true; md.close(); toast(T("تمت الاستعادة"), 'ok'); reload(); });
  };
  f.onsubmit = (e) => { e.preventDefault(); busy(e.submitter, async () => {
    read();
    await bapi('/fund/impact-page', { method: 'PUT', body: c });
    if ((f.motto.value.trim() || null) !== (d.motto || null)) await bapi('/fund/settings', { method: 'PUT', body: { motto: f.motto.value } });
    saving = true; md.close(); toast(T("تم حفظ الصفحة"), 'ok'); reload();
  }); };
  // closed without saving → the page goes back to what was saved
  const watch = setInterval(() => { if (!document.body.contains(md.el)) { clearInterval(watch); if (!saving) draw(saved || {}); } }, 300);
  preview();
}
function goalForm(g, after) {
  const md = modal(g ? T("تعديل الهدف") : T("هدف جديد للعائلة"), `<form autocomplete="off">
    <div class="fgrid">
      <label class="full">${T("العنوان")}<input name="title" required maxlength="120" value="${esc(g?.title || '')}" placeholder="${T("مثال: مساعدة زواج أحد الشباب")}"></label>
      <label>${T("نوع الهدف")}<select name="kind">${Object.entries(GOAL_KINDS).map(([k, [l]]) => `<option value="${k}" ${(g?.kind || 'campaign') === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label>${T("المستهدف")}<input name="target" type="number" step="0.01" min="0.01" inputmode="decimal" required value="${g?.target ?? ''}"></label>
      <label>${T("موعد مستهدف")} <span class="opt">${T("(اختياري)")}</span><input name="deadline" type="date" value="${g?.deadline || ''}"></label>
      <label>${T("رمز")}<input name="emoji" maxlength="8" value="${esc(g?.emoji || '🎯')}" style="font-size:20px;width:80px"></label>
    </div>
    <p class="hint" id="gKindHint">${icon('info')}<span></span></p>
    <div class="emoji-pick">${GOAL_EMOJI.map(e => `<button type="button" data-em="${e}">${e}</button>`).join('')}</div>
    <label style="margin-top:10px">${T("وصف قصير")} <span class="opt">${T("(اختياري)")}</span><textarea name="description" maxlength="600" rows="2">${esc(g?.description || '')}</textarea></label>
    <div class="sec-title" style="margin-top:12px">${T("اللون")}</div>
    <div class="goal-colors">${Object.entries(GOAL_COLORS).map(([k, l]) => `<label class="gc"><input type="radio" name="color" value="${k}" ${(g?.color || 'sunset') === k ? 'checked' : ''}><span class="g-${k}"></span><small>${l}</small></label>`).join('')}</div>
    <div class="row" style="margin-top:12px"><label class="check"><input type="checkbox" name="active" ${!g || g.active ? 'checked' : ''}> ${T("ظاهر لكل الأعضاء")}</label>
      ${g ? `<label class="check"><input type="checkbox" name="done" ${g.done_at ? 'checked' : ''}> ${T("تحقق الهدف")}</label>` : ''}</div>
    <div class="mf">${g ? `<button type="button" class="btn danger" id="gDel">${icon('trash')}${T("حذف")}</button><span class="grow"></span>` : ''}<button class="btn primary">${T("حفظ")}</button></div></form>`);
  const f = $('form', md.el);
  const hint = () => { $('#gKindHint span', md.el).textContent = GOAL_KINDS[f.kind.value][1]; };
  f.kind.onchange = hint; hint();
  $$('[data-em]', md.el).forEach(b => b.onclick = () => { f.emoji.value = b.dataset.em; });
  f.onsubmit = (e) => { e.preventDefault(); busy(e.submitter, async () => {
    const body = { ...formObj(f), active: f.active.checked };
    if (g) body.done = f.done.checked;
    if (g) await bapi('/fund/goals/' + g.id, { method: 'PUT', body }); else await bapi('/fund/goals', { method: 'POST', body });
    md.close(); toast(T("تم الحفظ"), 'ok'); after();
  }); };
  const del = $('#gDel', md.el);
  if (del) del.onclick = async () => {
    if (!await confirmBox(T("حذف الهدف"), `<p>${T("حذف")} <b>${esc(g.title)}</b>؟</p>`, T("حذف"), true)) return;
    try { await bapi('/fund/goals/' + g.id, { method: 'DELETE' }); md.close(); toast(T("تم الحذف"), 'ok'); after(); } catch (e) { fail(e); }
  };
}
async function giftForm(g, after) {
  const ov = await bapi('/fund/overview');
  const people = (ov.members || ov.tree || []).filter(m => !m.deceased);
  const md = modal(`${T("تسجيل مساهمة")} — ${g.title}`, `<form autocomplete="off"><div class="fgrid">
    <label class="full">${T("المساهم")}<select name="member_id"><option value="">${T("فاعل خير / من خارج الشجرة")}</option>${people.map(m => `<option value="${m.id}">${esc(m.name)}</option>`).join('')}</select></label>
    <label class="full" data-donor>${T("الاسم")} <span class="opt">${T("(اختياري)")}</span><input name="donor" maxlength="80" placeholder="${T("فاعل خير")}"></label>
    <label>${T("المبلغ")}<input name="amount" type="number" step="0.01" min="0.01" inputmode="decimal" required></label>
    <label>${T("التاريخ")}<input name="date" type="date" value="${S.me.today}" required></label>
    <label class="full">${T("ملاحظة")} <span class="opt">${T("(اختياري)")}</span><input name="note" maxlength="300"></label></div>
    <p class="hint">${icon('info')}<span>${T("مساهمات الحملات تُسجَّل منفصلة عن رصيد الصندوق، لأنها تُصرف على الهدف نفسه")}.</span></p>
    <div class="mf"><button class="btn primary">${icon('gift')}${T("تسجيل")}</button></div></form>`);
  const f = $('form', md.el);
  f.member_id.onchange = () => { $('[data-donor]', f).hidden = !!f.member_id.value; };
  f.onsubmit = (e) => { e.preventDefault(); busy(e.submitter, async () => {
    await bapi(`/fund/goals/${g.id}/gifts`, { method: 'POST', body: formObj(f) });
    md.close(); toast(T("جزاكم الله خيراً — تم تسجيل المساهمة"), 'ok'); after();
  }); };
}
async function giftsList(g, after) {
  const list = await bapi(`/fund/goals/${g.id}/gifts`);
  const md = modal(`${T("المساهمات")} — ${g.title}`, list.length ? `<div class="tbl-wrap"><table><thead><tr><th>${T("التاريخ")}</th><th>${T("المساهم")}</th><th>${T("المبلغ")}</th><th>${T("سجّلها")}</th><th></th></tr></thead><tbody>
    ${list.map(x => `<tr><td class="small" style="white-space:nowrap">${dayName(x.date)}<br>${x.date}</td><td><b>${esc(x.member_name || x.donor || T("فاعل خير"))}</b>${x.note ? `<div class="small muted">${esc(x.note)}</div>` : ''}</td><td class="n"><b>${money(x.amount)}</b></td><td class="small muted">${esc(x.by_name || '')}</td>
      <td>${can('fund_manage') ? `<button class="icon-btn danger" data-delgift="${x.id}" title="${T("حذف")}">${icon('trash')}</button>` : ''}</td></tr>`).join('')}</tbody>
    <tfoot><tr><td colspan="2"><b>${T("الإجمالي")}</b></td><td class="n"><b>${money(list.reduce((a, x) => a + x.amount, 0))}</b></td><td colspan="2"></td></tr></tfoot></table></div>` : `<p class="muted">${T("لا توجد مساهمات بعد")}</p>`, { wide: true });
  $$('[data-delgift]', md.el).forEach(b => b.onclick = async () => {
    if (!await confirmBox(T("حذف المساهمة"), `<p>${T("حذف هذه المساهمة؟ ستظهر في سجل التعديلات")}.</p>`, T("حذف"), true)) return;
    try { await bapi('/fund/gifts/' + b.dataset.delgift, { method: 'DELETE' }); md.close(); toast(T("تم الحذف"), 'ok'); after(); } catch (e) { fail(e); }
  });
}

/* ───────────── official receipt ───────────── */
const docHead = (title, side) => `<div class="rc-head"><div class="rc-logo">${fundLogo()}</div><div class="grow"><b>${esc(T(curBiz()?.name || ''))}</b><small>${title}</small></div>${side || ''}</div>`;
const rcRow = (l, v) => `<div class="r"><span>${l}</span><b>${v}</b></div>`;
VIEWS.receipt = async (el, [id]) => {
  const r = await bapi('/fund/receipts/' + Number(id));
  el.innerHTML = `${pageHead('receipt', T("إيصال استلام"), `<span dir="ltr">${r.no}</span>`, `<button class="btn" onclick="history.back()">${icon('chevR')}${T("رجوع")}</button><button class="btn primary" onclick="print()">${icon('printer')}${T("طباعة / حفظ PDF")}</button>`, 'no-print')}
  <div class="receipt ${r.deleted ? 'void' : ''}">
    ${docHead(T("إيصال استلام"), `<div class="rc-no"><small>${T("رقم الإيصال")}</small><b dir="ltr">${r.no}</b></div>`)}
    <div class="rc-amount"><small>${T("المبلغ المستلم")}</small><b class="num">${money(r.amount)}</b>
      ${r.deleted ? `<span class="rc-stamp">${T("ملغى")}</span>` : `<span class="rc-ok">${icon('check')}${T("تم الاستلام")}</span>`}</div>
    <div class="rc-rows">
      ${rcRow(T("استلمنا من"), `${esc(r.member.name)}${r.member.parent ? ` <span class="muted small">${T("ابن/ة")} ${esc(r.member.parent)}</span>` : ''}`)}
      ${rcRow(T("مقابل"), r.kind !== 'dues' ? `${T("قسط قرض")} — ${monLabel(r.month)}` : r.extra ? `${T("مساهمة إضافية")} — ${monLabel(r.month)}` : `${T("اشتراك شهر")} ${monLabel(r.for_month || r.month)}`)}
      ${r.loan ? rcRow(T("المتبقي من القرض بعد هذه الدفعة"), `<span class="num">${money(r.loan.remaining_after)}</span> <span class="muted small">${T("من")} ${money(r.loan.amount)}</span>`) : ''}
      ${rcRow(T("التاريخ"), `<span class="num">${esc(r.created_at.slice(0, 16))}</span>`)}
      ${rcRow(T("المستلم"), esc(r.by || '—'))}
      ${r.note ? rcRow(T("ملاحظة"), esc(r.note)) : ''}
    </div>
    ${!r.deleted && r.now.total_paid !== null ? `<div class="rc-sum"><span>${T("إجمالي المساهمة حتى اليوم")} <b class="num">${money(r.now.total_paid)}</b></span><span>${T("المتأخرات")} <b class="num ${r.now.arrears ? 'neg-t' : ''}">${money(r.now.arrears)}</b></span></div>` : ''}
    <div class="rc-foot">${icon('heart')}<span>${T("جزاكم الله خيراً على التزامكم — بكم يكبر الخير في العائلة")}</span><small>«${mottoOf(r)}»</small></div>
  </div>`;
};

/* ───────────── monthly statement ───────────── */
const ST_MSG = {
  full: ['ok', 'check', T("شكراً لك، اشتراك هذا الشهر مكتمل 💚")],
  late: ['ok', 'check', T("تم سداد اشتراك هذا الشهر بعد موعده — شكراً لك 💚")],
  partial: ['warn', 'alert', T("دُفع جزء من اشتراك الشهر، والمتبقي يُضاف إلى المتأخرات")],
  missed: ['warn', 'alert', T("لم يُسجَّل اشتراك هذا الشهر — نسعد بتسديده متى تيسّر")],
  open: ['info', 'clock', T("الشهر لم ينتهِ بعد، وهذا كشف حتى اليوم")],
  none: ['info', 'info', T("لا يوجد اشتراك مستحق في هذا الشهر")],
};
VIEWS.statement = async (el, [id, month]) => {
  if (!id) {
    const ov = await bapi('/fund/overview');
    if (!ov.mine.length) { el.innerHTML = `<div class="empty">${T("لا يوجد عضو مرتبط بحسابك")}</div>`; return; }
    id = ov.mine[0].id;
  }
  const s = await bapi(`/fund/statement/${Number(id)}${month ? '?month=' + month : ''}`);
  const go = (mid, m) => { location.hash = `#/statement/${mid}/${m}`; };
  let [cls, ic, msg] = ST_MSG[s.status] || ST_MSG.none;
  // paid this month, but the payment first covered an older month (payments go to the oldest unpaid month)
  if (['partial', 'missed'].includes(s.status) && s.paid_month > 0)
    msg = `${T("شكراً لك، وصلت دفعتك")} ${money(s.paid_month)} — ${T("وذهبت أولاً لتسديد شهر سابق لم يكتمل. المتبقي عليك")} ${money(s.arrears)}`;
  el.innerHTML = `${pageHead('fileText', T("الكشف الشهري"), `${esc(s.member.name)} · ${monLabel(s.month)}`, `<button class="btn primary" onclick="print()">${icon('printer')}${T("طباعة / حفظ PDF")}</button>`, 'no-print')}
    <section class="card no-print"><div class="mnav">
      <button class="icon-btn" id="sPrev" ${s.month <= s.first ? 'disabled' : ''}>${icon('chevR')}</button>
      <b class="grow center">${monLabel(s.month)}</b>
      <button class="icon-btn" id="sNext" ${s.month >= s.last ? 'disabled' : ''}>${icon('chevL')}</button></div>
      ${s.choices.length > 1 ? `<label style="margin-top:10px">${T("العضو")}<select id="sWho">${s.choices.map(c => `<option value="${c.id}" ${c.id === s.member.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>` : ''}</section>
    <div class="stmt">
      ${docHead(T("كشف حساب شهري"), `<div class="rc-no"><small>${T("الشهر")}</small><b>${monLabel(s.month)}</b></div>`)}
      <div class="st-hello">${T("أهلاً")} <b>${esc(s.member.name)}</b> 🌿</div>
      <div class="banner ${cls}" style="margin:0 18px">${icon(ic)}<span class="grow">${msg}</span></div>
      <div class="st-grid">
        <div class="st-ring">${ring(s.commitment, 'sm')}<small>${T("نسبة الالتزام")}</small></div>
        <div class="grid kpis fk">
          ${fk(T("المطلوب هذا الشهر"), M(s.due), 'calendar')}
          ${fk(T("المدفوع هذا الشهر"), M(s.paid_month), 'check', 'pos')}
          ${fk(T("المتأخرات"), M(s.arrears), 'alert', s.arrears ? 'neg' : '')}
          ${fk(T("إجمالي مساهمتك"), M(s.total_paid), 'coins', 'accent')}
        </div>
      </div>
      <div class="st-sec"><div class="sec-title">${icon('calendar')}<span class="grow">${T("آخر 12 شهراً")}</span>${mLegend()}</div>${monthStrip(s.months, 12)}</div>
      <div class="st-sec"><div class="sec-title">${icon('receipt')}<span class="grow">${T("دفعات هذا الشهر")}</span></div>
        ${s.payments.length ? `<div class="rc-rows">${s.payments.map(p => rcRow(`<a href="#/receipt/${p.id}" dir="ltr">${p.no}</a> · ${p.kind === 'dues' ? T("اشتراك") : T("قسط قرض")} <span class="muted small num">${p.created_at.slice(0, 10)}</span>`, `<span class="num">${money(p.amount)}</span>`)).join('')}</div>`
          : `<p class="muted small">${T("لا توجد دفعات مسجّلة لهذا الشهر")}</p>`}</div>
      ${s.loans.length ? `<div class="st-sec"><div class="sec-title">${icon('landmark')}<span class="grow">${T("القروض")}</span></div>
        ${s.loans.map(l => `<div class="loan-line"><div class="grow"><b class="num">${money(l.amount)}</b> <span class="muted small">· ${T("القسط")} ${money(l.installment)} · ${T("صُرف")} ${l.issued_date}</span>
          <div class="progress" style="margin-top:6px"><i style="width:${l.amount ? Math.min(100, l.paid / l.amount * 100) : 0}%"></i></div></div>
          <div class="small" style="text-align:end">${l.status === 'paid' ? `<span class="badge pos">${icon('check')}${T("تم السداد")}</span>` : `${T("المتبقي")} <b class="num">${money(l.remaining)}</b>`}${l.arrears ? `<div class="neg-t">${T("أقساط متأخرة")} ${money(l.arrears)}</div>` : ''}</div></div>`).join('')}</div>` : ''}
      <div class="rc-foot">${icon('heart')}<span>${T("شكراً لأنك جزء من هذا الخير — التزامك يصنع فرقاً في حياة أحد أفراد العائلة")}</span><small>«${mottoOf(s)}»</small></div>
    </div>`;
  $('#sPrev').onclick = () => go(s.member.id, prevMon(s.month));
  $('#sNext').onclick = () => go(s.member.id, nextMon(s.month));
  const who = $('#sWho'); if (who) who.onchange = () => go(who.value, s.month);
};
