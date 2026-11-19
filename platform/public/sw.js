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
