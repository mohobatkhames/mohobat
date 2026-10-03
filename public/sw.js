const CACHE = 'mohobat-shell-v2';
const SHELL = ['/', '/index.html', '/icons/icon-192.png', '/icons/icon-512.png', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/@') || url.pathname.startsWith('/src/') || url.pathname.startsWith('/node_modules/')) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const network = fetch(request)
        .then((response) => {
          if (response.ok) cache.put('/index.html', response.clone());
          return response;
        })
        .catch(() => null);
      const timed = new Promise((resolve) => {
        setTimeout(async () => resolve(await cache.match('/index.html')), 1500);
      });
      const response = await Promise.race([network, timed]);
      if (response) return response;
      const cached = await cache.match('/index.html');
      if (cached) return cached;
      return new Response('تعذر الاتصال', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    })());
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/'))) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        return new Response('تعذر الاتصال', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }),
  );
});
