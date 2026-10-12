/* ============================================================
   School Hub Pro — service worker
   Caches the app shell so the PWA installs and works offline.
   Backend calls always go to the network — they are never cached.
   ============================================================ */
const CACHE_NAME = 'shp-shell-v2';
const SHELL = [
  './',
  './index.html',
  './css/style.css',
  './js/api.js',
  './js/app.js',
  './manifest.json',
  './favicon.png'
];

/* Install: pre-cache the shell. Individual failures don't block install. */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.all(
        SHELL.map(url =>
          cache.add(url).catch(err => {
            console.warn('[sw] failed to cache', url, err && err.message);
          })
        )
      ))
      .then(() => self.skipWaiting())
  );
});

/* Activate: drop any old caches, take control of open pages. */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* Fetch: network-first for same-origin. Falls back to cache when offline. */
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Never intercept Apps Script / Google API calls — always hit the network.
  if (url.hostname === 'script.google.com' || url.hostname === 'script.googleusercontent.com') return;

  // Skip cross-origin (fonts, pdf.js CDN, etc.) — let the browser handle them.
  if (url.origin !== location.origin) return;

  event.respondWith(
    fetch(req)
      .then(res => {
        // Only cache successful basic responses.
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then(cached => {
          if (cached) return cached;
          // Navigation requests that miss the cache fall back to the app shell.
          if (req.mode === 'navigate') return caches.match('./index.html');
          return new Response('', { status: 504, statusText: 'Offline' });
        })
      )
  );
});
