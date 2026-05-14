const CACHE_NAME = 'ito-static-v1';

// Cacheia só assets estáticos que nunca mudam (ícones, manifest)
// index.html NUNCA é cacheado — sempre busca da rede para garantir código atualizado
const STATIC_ASSETS = [
  '/manifest.json',
  '/icons/icon-light.png',
  '/icons/icon-dark.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Navegação (HTML): sempre rede — garante código sempre atualizado após deploy
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request));
    return;
  }
  // Assets estáticos: cache-first
  event.respondWith(
    caches.match(event.request).then(r => r || fetch(event.request))
  );
});
