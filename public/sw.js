const CACHE_NAME = 'hk-budget-web-v4';
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

  // No tocar NADA que no sea del propio origen
  if (url.origin !== self.location.origin) return;

  // Rutas que el service worker nunca debe interceptar:
  // - /api/  -> backend (datos en vivo, nunca el shell de la app)
  // - /__/   -> handlers de autenticacion de Firebase (el popup de Google)
  // - /tienda/ -> imagenes servidas por la tienda via proxy
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/__/') ||
    url.pathname.startsWith('/tienda/')
  ) {
    return;
  }

  if (event.request.method !== 'GET') return;

  // Para navegacion (abrir la app): red primero, y si no hay conexion, el shell cacheado.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/', clone));
          return response;
        })
        .catch(() => caches.match('/'))
    );
    return;
  }

  // Para el resto de archivos estaticos (js, css, iconos): red primero,
  // y si falla se usa la copia cacheada de ESE archivo puntual.
  // Importante: nunca devolvemos el shell como reemplazo de otro archivo.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});