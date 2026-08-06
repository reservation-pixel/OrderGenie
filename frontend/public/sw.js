// Hand-written service worker (next-pwa is incompatible with Next 16's Turbopack —
// it requires a webpack() config hook that Turbopack does not support). Precaches a
// minimal app shell and falls back to /offline when navigation fails offline.

const CACHE_VERSION = 'ordergenie-v1';
const APP_SHELL = ['/offline', '/login'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // never intercept cross-origin API calls

  // Navigations: network-first, cache fallback, then the offline shell.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached ?? caches.match('/offline')))
    );
    return;
  }

  // Content-hashed static assets: cache-first (safe — a new deploy ships new hashes).
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
            return response;
          })
      )
    );
  }
});

// Best-effort Background Sync: retries a queued manual-sync request when connectivity
// returns. Given this stack has no Redis/queue backing, this stays a lightweight
// notify-the-page hook rather than a durable offline write queue.
self.addEventListener('sync', (event) => {
  if (event.tag === 'manual-sync-retry') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => client.postMessage({ type: 'RETRY_MANUAL_SYNC' }));
      })
    );
  }
});
