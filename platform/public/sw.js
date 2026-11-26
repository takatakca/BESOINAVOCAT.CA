'use strict';
// Service worker of the installable portal (Android, iOS, Windows, macOS, Linux).
// Privacy rule: only the public shell (pages, scripts, styles, fonts, icons) is ever cached.
// /api/ responses, uploads and every non-GET request go straight to the network and are never stored.
const CACHE = 'besoinavocat-shell-v1';
const SHELL = ['/offline.html', '/styles.css', '/icons/icon-192.png', '/fonts/inter-latin.woff2'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
    .then(() => self.clients.claim()));
});

function cacheable(request) {
  if (request.method !== 'GET') return false;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/integrations/')) return false;
  return /\.(?:css|js|woff2|png|webmanifest)$/u.test(url.pathname);
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    // Pages: always the network (fresh code after each deploy); the offline page only when there is no connection.
    event.respondWith(fetch(request).catch(() => caches.match('/offline.html')));
    return;
  }
  if (!cacheable(request)) return;
  // Public assets: network first, last good copy when offline.
  event.respondWith(fetch(request).then(response => {
    if (response.ok) { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(request, copy)); }
    return response;
  }).catch(() => caches.match(request).then(hit => hit || Response.error())));
});

// Share sheet of the phone/computer ("Partager vers BesoinAvocat"): the files and text are kept only until
// the portal page picks them up (a few seconds), then deleted. They never leave the device by themselves:
// the person still confirms the upload into a case.
const SHARE_CACHE = 'besoinavocat-partage';
self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'POST' || new URL(request.url).pathname !== '/partager') return;
  event.respondWith((async () => {
    try {
      const form = await request.formData();
      const cache = await caches.open(SHARE_CACHE);
      await Promise.all((await cache.keys()).map(key => cache.delete(key)));
      const files = form.getAll('fichiers').filter(file => file && typeof file === 'object' && file.size > 0).slice(0, 20);
      await Promise.all(files.map((file, index) => cache.put(`/partage/fichier/${index}`, new Response(file, {
        headers: { 'Content-Type': file.type || 'application/octet-stream', 'X-Nom': encodeURIComponent(file.name || `piece-${index + 1}`) },
      }))));
      const text = ['titre', 'texte', 'lien'].map(name => String(form.get(name) || '').slice(0, 4000)).filter(Boolean).join('\n');
      if (text) await cache.put('/partage/texte', new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }));
    } catch { /* nothing usable was shared */ }
    return Response.redirect('/?partage=1', 303);
  })());
});

// Background sync and periodic sync: refresh the public shell so the installed app opens up to date offline.
async function refreshShell() {
  const cache = await caches.open(CACHE);
  await Promise.all(SHELL.map(url => fetch(url, { cache: 'no-store' }).then(response => (response.ok ? cache.put(url, response) : null)).catch(() => null)));
}
self.addEventListener('sync', event => { if (event.tag === 'besoinavocat-shell') event.waitUntil(refreshShell()); });
self.addEventListener('periodicsync', event => { if (event.tag === 'besoinavocat-shell') event.waitUntil(refreshShell()); });

// Case notifications (Web Push). The payload carries only a short title, text and a portal link: never case content.
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { texte: event.data ? event.data.text() : '' }; }
  const title = String(data.titre || 'BesoinAvocat').slice(0, 120);
  const body = String(data.texte || 'Du nouveau dans votre dossier.').slice(0, 300);
  const link = new URL(String(data.lien || '/'), self.location.origin);
  const url = link.origin === self.location.origin ? link.pathname + link.search : '/';
  event.waitUntil(self.registration.showNotification(title, { body, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', tag: data.tag || 'besoinavocat', data: { url } }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const open = list.find(client => new URL(client.url).origin === self.location.origin);
    if (open) { open.navigate(url).catch(() => {}); return open.focus(); }
    return self.clients.openWindow(url);
  }));
});

// Windows widget board (manifest "widgets"): a card with quick links to the portal.
async function renderWidget(widget) {
  const definition = widget?.definition;
  if (!definition || !self.widgets) return;
  const [template, data] = await Promise.all([fetch(definition.msAcTemplate).then(r => r.text()), fetch(definition.data).then(r => r.text())]);
  await self.widgets.updateByTag(definition.tag, { template, data });
}
self.addEventListener('widgetinstall', event => { event.waitUntil(renderWidget(event.widget)); });
self.addEventListener('widgetresume', event => { event.waitUntil(renderWidget(event.widget)); });
self.addEventListener('widgetclick', event => { if (event.action === 'ouvrir') event.waitUntil(self.clients.openWindow('/')); });
self.addEventListener('activate', event => {
  event.waitUntil(caches.delete(SHARE_CACHE).catch(() => false).then(() => (self.widgets ? self.widgets.getByTag('besoinavocat-dossier').then(renderWidget).catch(() => {}) : null)));
});
