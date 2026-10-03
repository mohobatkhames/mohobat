const CACHE = 'mohobat-shell-v3';
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
      const cached = await cache.match('/index.html');
      const fresh = fetch(request)
        .then(async (response) => {
          const text = response.ok ? await response.clone().text() : '';
          const renderPage = text.includes('SERVICE WAKING UP') || text.includes('APPLICATION LOADING');
          if (response.ok && !renderPage && (response.headers.get('x-mohobat-app') === '1' || text.includes('boot-splash') || text.includes('id="root"'))) {
            cache.put('/index.html', response.clone());
            return response;
          }
          return null;
        })
        .catch(() => null);
      if (cached) {
        fresh.catch(() => {});
        return cached;
      }
      const raced = await Promise.race([
        fresh,
        new Promise((resolve) => setTimeout(() => resolve(null), 12000)),
      ]);
      if (raced) return raced;
      const settled = await fresh;
      if (settled) return settled;
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
