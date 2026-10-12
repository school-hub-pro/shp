/* ============================================================
   School Hub Pro — service worker
   Caches the app shell so the PWA installs and works offline.
   Backend calls always go to the network — they are never cached.
   ============================================================ */
const CACHE_NAME = 'shp-shell-v1';
const SHELL = [
  './',
  './index.html',
  './css/style.css',
  './js/api.js',
  './js/app.js',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

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
        const copy = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() =>
        caches.match(req).then(cached => cached || caches.match('./index.html'))
      )
  );
});
