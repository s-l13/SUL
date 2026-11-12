// Appearance engine — loaded in <head> so the look is applied before first paint.
// A "look" = { mode, accent, bg, side, radius, font, size, density }.
// Priority: personal look (this device) > business look (set by the owner) > defaults.
(function (root) {
  const PALETTE = {
    teal: '#0f766e', emerald: '#059669', green: '#15803d', olive: '#65771e', sky: '#0284c7', blue: '#1d4ed8',
    indigo: '#4338ca', violet: '#6d28d9', purple: '#9333ea', pink: '#db2777', rose: '#e11d48', maroon: '#9f1239',
    red: '#dc2626', orange: '#ea580c', amber: '#d97706', gold: '#b8892b', brown: '#8b5a2b', slate: '#334155', graphite: '#18181b',
  };
  const DEFAULT = { mode: 'auto', accent: '#0f766e', bg: 'neutral', side: 'light', radius: 'md', font: 'plex', size: 'md', density: 'comfy' };
  const PRESETS = {
    classic: { mode: 'light', accent: '#0f766e', bg: 'neutral', side: 'light', radius: 'md' },
    navy: { mode: 'dark', accent: '#3b82f6', bg: 'neutral', side: 'dark', radius: 'md' },
    sand: { mode: 'light', accent: '#b8892b', bg: 'warm', side: 'light', radius: 'lg' },
    ocean: { mode: 'light', accent: '#0284c7', bg: 'tint', side: 'brand', radius: 'lg' },
    forest: { mode: 'light', accent: '#15803d', bg: 'tint', side: 'brand', radius: 'md' },
    rose: { mode: 'light', accent: '#e11d48', bg: 'tint', side: 'light', radius: 'lg' },
    royal: { mode: 'dark', accent: '#d4a03a', bg: 'warm', side: 'dark', radius: 'sm' },
    pro: { mode: 'light', accent: '#334155', bg: 'white', side: 'dark', radius: 'sm' },
  };
  const FONTS = {
    plex: ["'IBM Plex Sans Arabic'", 'IBM+Plex+Sans+Arabic:wght@400;500;600;700'],
    tajawal: ["'Tajawal'", 'Tajawal:wght@400;500;700'],
    cairo: ["'Cairo'", 'Cairo:wght@400;500;600;700'],
    almarai: ["'Almarai'", 'Almarai:wght@400;700'],
    kufi: ["'Noto Kufi Arabic'", 'Noto+Kufi+Arabic:wght@400;500;600;700'],
  };
  const OPTIONS = { mode: ['light', 'dark', 'auto'], bg: ['neutral', 'tint', 'white', 'warm'], side: ['light', 'brand', 'dark'], radius: ['sm', 'md', 'lg'], size: ['md', 'lg'], density: ['comfy', 'compact'] };

  const rgbOf = (h) => { h = String(h || '').replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); return /^[0-9a-f]{6}$/i.test(h) ? [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)) : null; };
  const toWhite = (rgb, t) => rgb.map(c => Math.round(c + (255 - c) * t));
  const lum = (rgb) => { const f = rgb.map(c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }); return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2]; };
  const css = (rgb) => `rgb(${rgb.join(',')})`;
  const get = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };

  // keep only known keys / values (also used for the business look coming from the server)
  function clean(o) {
    const out = {};
    if (!o || typeof o !== 'object') return out;
    for (const k of Object.keys(OPTIONS)) if (OPTIONS[k].includes(o[k])) out[k] = o[k];
    if (rgbOf(o.accent)) out.accent = '#' + String(o.accent).replace('#', '').toLowerCase();
    if (FONTS[o.font]) out.font = o.font;
    return out;
  }
  function personal() {
    let own = null;
    try { own = JSON.parse(get('look') || 'null'); } catch (e) { }
    if (!own) { // migrate the earlier single settings
      const t = get('theme'), a = get('accent'), s = get('size');
      if (t || a || s) own = { mode: t || undefined, accent: PALETTE[a] || a || undefined, size: s || undefined };
    }
    return own ? clean(own) : null;
  }
  function business() { try { return clean(JSON.parse(get('bizLook') || 'null')); } catch (e) { return {}; } }
  function current() { const own = personal(); return { look: Object.assign({}, DEFAULT, business(), own || {}), personal: !!own }; }

  function apply(L) {
    const r = document.documentElement;
    const dark = L.mode === 'dark' || (L.mode === 'auto' && root.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
    r.setAttribute('data-theme', dark ? 'dark' : 'light');
    for (const k of ['bg', 'side', 'radius', 'size', 'density']) r.setAttribute('data-' + k, L[k]);
    const rgb = rgbOf(L.accent) || rgbOf(DEFAULT.accent);
    const brand = dark ? toWhite(rgb, lum(rgb) < 0.08 ? 0.45 : 0.25) : rgb; // lift the colour on dark backgrounds
    r.style.setProperty('--brand', css(brand));
    r.style.setProperty('--accent-raw', css(rgb));
    r.style.setProperty('--on-brand', lum(brand) > 0.42 ? '#0b0f14' : '#ffffff');
    r.style.setProperty('--side-ink', lum(rgb) > 0.42 ? '#0b0f14' : '#ffffff');
    const f = FONTS[L.font] || FONTS.plex;
    r.style.setProperty('--font', f[0] + ", 'Segoe UI', Tahoma, sans-serif");
    loadFont(L.font);
  }
  function loadFont(key) {
    if (!FONTS[key] || key === 'plex' || document.getElementById('font-' + key)) return;
    const l = document.createElement('link');
    l.id = 'font-' + key; l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=' + FONTS[key][1] + '&display=swap';
    document.head.appendChild(l);
  }
  function savePersonal(L) { try { localStorage.setItem('look', JSON.stringify(clean(L))); ['theme', 'accent', 'size'].forEach(k => localStorage.removeItem(k)); } catch (e) { } apply(current().look); }
  function clearPersonal() { try { ['look', 'theme', 'accent', 'size'].forEach(k => localStorage.removeItem(k)); } catch (e) { } apply(current().look); }
  function setBusiness(o) { try { localStorage.setItem('bizLook', JSON.stringify(clean(o))); } catch (e) { } apply(current().look); }

  root.LOOK = { PALETTE, DEFAULT, PRESETS, FONTS, OPTIONS, clean, current, apply, savePersonal, clearPersonal, setBusiness, loadFont };
  apply(current().look);
  if (root.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { const c = current().look; if (c.mode === 'auto') apply(c); });
  if (get('lang') === 'en') { document.documentElement.lang = 'en'; document.documentElement.dir = 'ltr'; }
})(window);
