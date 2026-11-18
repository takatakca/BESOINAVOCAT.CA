'use strict';
// Makes the portal installable as an app on phones, tablets and computers,
// and usable with a TV remote (arrow keys + OK + Back) on smart TVs.
if ('serviceWorker' in navigator && window.isSecureContext) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {}); });
}

(() => {
  const TV_AGENT = /\b(?:SMART-TV|SmartTV|Tizen|Web0S|webOS|NetCast|AFT[A-Z0-9]*|BRAVIA|GoogleTV|Android TV|AndroidTV|CrKey|HbbTV|Roku|VIDAA|Xbox)\b/iu;
  let forced = null;
  try {
    const flag = new URLSearchParams(window.location.search).get('tv');
    if (flag === '1' || flag === '0') { forced = flag === '1'; window.localStorage.setItem('besoinavocat-tv', flag); }
    else { const saved = window.localStorage.getItem('besoinavocat-tv'); if (saved === '1' || saved === '0') forced = saved === '1'; }
  } catch { /* storage may be blocked */ }
  const tv = forced ?? TV_AGENT.test(navigator.userAgent || '');
  if (!tv) return;
  document.documentElement.classList.add('tv-mode');

  // Remote "Back" keys: Tizen (10009), webOS (461), Fire TV / Android TV (Escape / BrowserBack).
  const BACK = new Set([10009, 461]);
  const DIRS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

  const visible = (el) => {
    if (el.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    // Skip links and other off-page helpers sit above or left of the page.
    if (r.bottom + window.scrollY < 0 || r.right + window.scrollX < 0) return false;
    const s = window.getComputedStyle(el);
    return s.visibility !== 'hidden' && s.display !== 'none';
  };
  const candidates = () => {
    const dialog = [...document.querySelectorAll('dialog[open], [role="dialog"]:not([hidden])')].pop();
    return [...(dialog || document).querySelectorAll(FOCUSABLE)].filter(visible);
  };
  const typing = (el) => el && (el.isContentEditable || (el.tagName === 'INPUT' && !/^(?:button|submit|reset|checkbox|radio|file|range|color)$/iu.test(el.type)) || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT');

  const move = (dx, dy) => {
    const items = candidates();
    if (!items.length) return false;
    const current = document.activeElement && document.activeElement !== document.body ? document.activeElement : null;
    if (!current || !items.includes(current)) { items[0].focus(); return true; }
    const a = current.getBoundingClientRect();
    const ax = a.left + a.width / 2; const ay = a.top + a.height / 2;
    let best = null; let bestScore = Infinity;
    for (const el of items) {
      if (el === current) continue;
      const b = el.getBoundingClientRect();
      const bx = b.left + b.width / 2; const by = b.top + b.height / 2;
      const along = (bx - ax) * dx + (by - ay) * dy;
      if (along <= 1) continue;
      const across = Math.abs((bx - ax) * dy) + Math.abs((by - ay) * dx);
      const score = along + across * 2.5;
      if (score < bestScore) { bestScore = score; best = el; }
    }
    if (!best) return false;
    best.focus({ preventScroll: true });
    best.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    return true;
  };

  document.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const active = document.activeElement;
    if (BACK.has(event.keyCode) || event.key === 'BrowserBack' || event.key === 'GoBack') {
      event.preventDefault();
      if (typing(active)) { active.blur(); return; }
      const open = [...document.querySelectorAll('dialog[open]')].pop();
      if (open) { open.close(); return; }
      if (window.history.length > 1) window.history.back();
      return;
    }
    const dir = DIRS[event.key];
    if (!dir) return;
    // Inside a text field, left/right move the caret; up/down leave the field.
    if (typing(active) && dir[0] !== 0) return;
    if (move(dir[0], dir[1])) event.preventDefault();
  });

  window.addEventListener('load', () => {
    if (!document.activeElement || document.activeElement === document.body) {
      const first = document.querySelector('main ' + FOCUSABLE.split(', ').join(', main ')) || candidates()[0];
      if (first && visible(first)) first.focus({ preventScroll: true });
    }
  });
})();
