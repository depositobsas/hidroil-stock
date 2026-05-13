const CACHE = 'hidroil-stock-v5';

// Estos archivos NUNCA se cachean — siempre se leen del servidor
const NO_CACHE = ['index.html', 'auth.json'];

// Estos se cachean para uso offline
const CACHE_ASSETS = [
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(CACHE_ASSETS)).catch(err => console.warn('Cache parcial:', err))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => {
        console.log('Eliminando cache viejo:', k);
        return caches.delete(k);
      }))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  const filename = url.pathname.split('/').pop();

  // index.html y auth.json — SIEMPRE red, nunca caché
  if(NO_CACHE.some(f => filename === f || url.pathname.endsWith(f))){
    e.respondWith(
      fetch(e.request, {cache: 'no-store'}).catch(() => caches.match(e.request))
    );
    return;
  }

  // Excel files — red primero, caché como fallback
  if(filename.endsWith('.xlsx')){
    e.respondWith(
      fetch(e.request, {cache: 'no-store'}).then(resp => {
        const clone = resp.clone();
        caches.open(CACHE).then(cache => cache.put(e.request, clone));
        return resp;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // SheetJS y otros assets — caché first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if(cached) return cached;
      return fetch(e.request).then(resp => {
        if(resp && resp.status === 200){
          const clone = resp.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return resp;
      });
    })
  );
});
