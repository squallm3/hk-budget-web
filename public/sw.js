const CACHE_NAME = 'hk-budget-web-v3';
const APP_SHELL = ['/', '/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Nunca tocar llamadas a la API, aunque compartan el mismo dominio que la app
  // (siempre tienen que ir a la red en vivo, nunca servirse desde caché ni desde el shell)
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Nunca cachear pedidos a otro origen (imágenes de la tienda, etc.)
  if (url.origin !== self.location.origin) {
    return;
  }

  // Solo cachear pedidos GET del propio origen (el shell de la app)
  if (event.request.method !== 'GET') return;

  // Red primero: si hay conexión, siempre trae la versión más nueva.
  // Si falla (sin conexión), recién ahí usa lo que haya en caché.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/')))
  );
});