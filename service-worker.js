const CACHE = 'consulta-farmacologica-v2';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './drug-index.json',
  './manifest.webmanifest',
  './icon.svg',
  './icon-192.png',
  './icon-512.png'
];

const PDFJS_ASSETS = [
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(ASSETS);

    // Cache the renderer while online so subsequent use can remain offline.
    await Promise.all(PDFJS_ASSETS.map(async url => {
      try {
        const response = await fetch(url, { mode: 'cors' });
        if (response.ok) await cache.put(url, response);
      } catch (error) {
        console.warn('No se pudo precargar PDF.js:', url, error);
      }
    }));

    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name !== CACHE).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;

    try {
      const response = await fetch(event.request);
      const copy = response.clone();
      const cache = await caches.open(CACHE);
      cache.put(event.request, copy).catch(() => {});
      return response;
    } catch {
      return new Response('Sin conexión y recurso no disponible en caché.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }
  })());
});
