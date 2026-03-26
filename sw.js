const CACHE = 'after-pasquetta-v25';
const ASSETS = ['./', './index.html', './style.css', './manifest.json', './icon-192.png'];

// Ricevi il messaggio dall'app per attivarsi subito
self.addEventListener('message', e => {
  if(e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
  );
  // Non chiamiamo skipWaiting qui — aspettiamo che l'utente tocchi "Aggiorna ora"
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Non cachare mai chiamate Firebase / API esterne
  if(url.hostname.includes('firebasedatabase.app') ||
     url.hostname.includes('firebaseio.com') ||
     url.hostname.includes('googleapis.com') && url.pathname.includes('/v1')){
    return;
  }

  // Navigazione o index.html: sempre network-first con cache: no-store
  const isNav = e.request.mode === 'navigate';
  const isIndex = url.pathname.endsWith('/index.html') || url.pathname.endsWith('/');
  if(isNav || isIndex){
    e.respondWith(
      fetch(e.request, { cache: 'no-store' })
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return response;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Tutto il resto: network-first con fallback cache
  e.respondWith(
    fetch(e.request)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});
