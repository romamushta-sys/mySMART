// Service worker: приложение открывается без интернета.
const V = 'sg-v2';
const LOCAL = ['./', 'index.html', 'config.js', 'manifest.json', 'icon-192.png', 'icon-512.png'];
const CDN = [
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://fonts.googleapis.com/css2?family=Literata:wght@500;700&family=Onest:wght@400;500;600&display=swap'
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(V);
    await c.addAll(LOCAL);
    // Внешние библиотеки кэшируем сразу при установке, а не при следующем визите
    await Promise.allSettled(CDN.map(u =>
      fetch(new Request(u, { mode: 'no-cors' })).then(res => c.put(u, res))
    ));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.hostname.endsWith('supabase.co')) return;           // данные идут напрямую в сеть
  if (u.origin === location.origin) {                        // свои файлы: сначала сеть, без связи кэш
    e.respondWith(
      fetch(r).then(res => {
        if (res.ok) { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); }
        return res;
      }).catch(() => caches.match(r).then(m => m || caches.match('index.html')))
    );
  } else {                                                   // библиотеки и шрифты: сначала кэш
    e.respondWith(
      caches.match(r).then(m => m || fetch(r).then(res => {
        const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); return res;
      }).catch(() => m))
    );
  }
});
