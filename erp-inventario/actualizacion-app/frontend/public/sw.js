/*
 * Service worker de la app instalable.
 * - Los datos (/api) siempre vienen del servidor: nunca se guardan en caché,
 *   así el stock mostrado es siempre el real.
 * - La interfaz se pide primero a la red y, si no hay conexión, se usa la última copia.
 */
const CACHE = 'erp-inventario-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api')) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copia = res.clone();
          caches.open(CACHE).then((c) => c.put(req.mode === 'navigate' ? '/' : req, copia));
        }
        return res;
      })
      .catch(() => caches.match(req.mode === 'navigate' ? '/' : req))
  );
});
