'use strict';
// Makes the portal installable as an app on phones, tablets and computers,
// and usable with a TV remote (arrow keys + OK + Back) on smart TVs.
if ('serviceWorker' in navigator && window.isSecureContext) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(async (registration) => {
      // Keep the installed app's public shell fresh (Chrome/Edge only; silently skipped elsewhere).
      try {
        if ('periodicSync' in registration) {
          const status = await navigator.permissions.query({ name: 'periodic-background-sync' });
          if (status.state === 'granted') await registration.periodicSync.register('besoinavocat-shell', { minInterval: 24 * 60 * 60 * 1000 });
        }
        if ('sync' in registration) window.addEventListener('online', () => { registration.sync.register('besoinavocat-shell').catch(() => {}); });
      } catch { /* not supported */ }
    }).catch(() => {});
  });
}

// Files opened with the app ("Ouvrir avec BesoinAvocat") or shared to it from another app go to the
// "Pièces du dossier" drop zone of the open case, where the normal upload (with confirmation) takes over.
(() => {
  const notice = (text, copy) => {
    let box = document.getElementById('pwa-arrivee');
    if (!box) {
      box = document.createElement('div');
      box.id = 'pwa-arrivee';
      box.setAttribute('role', 'status');
      Object.assign(box.style, { position: 'fixed', left: '50%', bottom: '24px', transform: 'translateX(-50%)', zIndex: '60', maxWidth: 'min(560px, calc(100% - 32px))', padding: '14px 16px', borderRadius: '12px', background: '#792936', color: '#fff', boxShadow: '0 12px 32px rgba(0,0,0,.25)', font: '15px/1.4 Inter, system-ui, sans-serif', display: 'flex', gap: '12px', alignItems: 'center' });
      document.body.appendChild(box);
    }
    box.replaceChildren();
    const span = document.createElement('span'); span.textContent = text; span.style.flex = '1'; box.appendChild(span);
    if (copy) {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = 'Copier le texte';
      Object.assign(button.style, { background: '#fff', color: '#792936', border: '0', borderRadius: '8px', padding: '8px 12px', font: 'inherit', fontWeight: '600', cursor: 'pointer' });
      button.addEventListener('click', () => { navigator.clipboard?.writeText(copy).then(() => { button.textContent = 'Copié'; }).catch(() => {}); });
      box.appendChild(button);
    }
    const close = document.createElement('button'); close.type = 'button'; close.textContent = '×'; close.setAttribute('aria-label', 'Fermer');
    Object.assign(close.style, { background: 'transparent', color: '#fff', border: '0', fontSize: '22px', cursor: 'pointer', lineHeight: '1' });
    close.addEventListener('click', () => box.remove());
    box.appendChild(close);
  };

  const deliver = (files) => {
    if (!files.length) return;
    const label = files.length > 1 ? `${files.length} fichiers` : `« ${files[0].name} »`;
    const drop = () => {
      const input = document.getElementById('drop-input');
      if (!input) return false;
      const transfer = new DataTransfer();
      files.forEach(file => transfer.items.add(file));
      input.files = transfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      notice(`${label} ajouté${files.length > 1 ? 's' : ''} aux pièces du dossier ouvert.`);
      return true;
    };
    if (drop()) return;
    notice(`${label} prêt${files.length > 1 ? 's' : ''} : connectez-vous et ouvrez « Pièces » dans votre dossier pour l’ajouter.`);
    const observer = new MutationObserver(() => { if (drop()) observer.disconnect(); });
    observer.observe(document.body, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 30 * 60 * 1000);
  };

  if ('launchQueue' in window) {
    window.launchQueue.setConsumer(async (params) => {
      const handles = params?.files || [];
      const files = (await Promise.all(handles.map(handle => handle.getFile().catch(() => null)))).filter(Boolean).slice(0, 20);
      deliver(files);
    });
  }

  const params = new URLSearchParams(window.location.search);
  if (params.get('partage') === '1' && 'caches' in window) {
    window.addEventListener('load', async () => {
      try {
        const cache = await caches.open('besoinavocat-partage');
        const keys = await cache.keys();
        const files = []; let text = '';
        for (const key of keys) {
          const response = await cache.match(key);
          if (!response) continue;
          if (new URL(key.url).pathname === '/partage/texte') text = await response.text();
          else files.push(new File([await response.blob()], decodeURIComponent(response.headers.get('X-Nom') || 'piece'), { type: response.headers.get('Content-Type') || '' }));
        }
        await caches.delete('besoinavocat-partage');
        window.history.replaceState(null, '', '/');
        if (files.length) deliver(files);
        else if (text) notice('Texte reçu. Collez-le dans un message ou une note de votre dossier.', text);
      } catch { /* nothing to pick up */ }
    });
  }
})();

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
