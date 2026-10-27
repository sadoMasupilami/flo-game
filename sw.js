// Service Worker: hält Portalnacht im Speicher, damit es auch ohne Internet startet.
// Online wird immer zuerst die neueste Version geladen, offline die gespeicherte.
const CACHE = 'portalnacht-__VERSION__';
const FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'js/vendor/three.min.js',
  'js/core.js',
  'js/textures.js',
  'js/music.js',
  'js/world.js',
  'js/atmos.js',
  'js/wetter.js',
  'js/models.js',
  'js/entities.js',
  'js/combat.js',
  'js/viewmodels.js',
  'js/erfolge.js',
  'js/aufgaben.js',
  'js/geheimnisse.js',
  'js/endlos.js',
  'js/karte.js',
  'js/leute.js',
  'js/main.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // Eigene Dateien immer beim Server nachfragen (kein veralteter Zwischenspeicher), fremde normal laden
  const own = new URL(e.request.url).origin === self.location.origin;
  e.respondWith(
    (own ? fetch(e.request.url, { cache: 'no-cache', credentials: 'same-origin' }) : fetch(e.request))
      .then(res => {
        if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html')))
  );
});
