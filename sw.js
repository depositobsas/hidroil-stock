const CACHE = 'hidroil-stock-v4';
const ASSETS = [
  '/hidroil-stock/',
  '/hidroil-stock/index.html',
  '/hidroil-stock/reporte.xlsx',
  '/hidroil-stock/pc.xlsx',
  '/hidroil-stock/oc.xlsx',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

// auth.json NUNCA se cachea — siempre se lee fresco
const NO_CACHE = ['/hidroil-stock/auth.json'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS)).catch(err => console.warn('Cache parcial:', err))
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

  // auth.json — siempre red, nunca cache
  if(NO_CACHE.some(p => url.pathname.includes(p.replace('/hidroil-stock','')))){
    e.respondWith(fetch(e.request, {cache:'no-store'}));
    return;
  }

  // Excel files — red primero, cache como fallback
  if(e.request.url.includes('.xlsx')){
    e.respondWith(
      fetch(e.request).then(resp => {
        const clone = resp.clone();
        caches.open(CACHE).then(cache => cache.put(e.request, clone));
        return resp;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // Resto — cache first, red como fallback
  e.respondWith(
    caches.match(e.request).then(cached => {
      if(cached) return cached;
      return fetch(e.request).then(resp => {
        if(resp && resp.status === 200){
          const clone = resp.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return resp;
      }).catch(() => caches.match('/hidroil-stock/'));
    })
  );
});
