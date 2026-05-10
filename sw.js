const CACHE = 'hidroil-stock-v1';
const ASSETS = [
  '/hidroil-stock/',
  '/hidroil-stock/index.html',
  '/hidroil-stock/reporte.xlsx',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

// Instalar — cachear archivos clave
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS)).catch(err => console.warn('Cache parcial:', err))
  );
  self.skipWaiting();
});

// Activar — limpiar caches viejos
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — red primero, cache como fallback
self.addEventListener('fetch', e => {
  // Para el reporte.xlsx siempre intentar red primero (datos frescos)
  if (e.request.url.includes('reporte.xlsx')) {
    e.respondWith(
      fetch(e.request).then(resp => {
        const clone = resp.clone();
        caches.open(CACHE).then(cache => cache.put(e.request, clone));
        return resp;
      }).catch(() => caches.match(e.request))
    );
    return;
  }
  // Para el resto: cache first, red como fallback
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        if (resp && resp.status === 200) {
          const clone = resp.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return resp;
      }).catch(() => caches.match('/hidroil-stock/'));
    })
  );
});
