const CACHE_NAME = 'klarpakke-v1';
const COURSE_CACHE = 'klarpakke-courses-v1';

const PRECACHE_URLS = [
  '/offline',
];

const COURSE_URL_PATTERN = /\/kurs\//;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== COURSE_CACHE)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  if (COURSE_URL_PATTERN.test(request.url)) {
    event.respondWith(
      caches.open(COURSE_CACHE).then((cache) =>
        fetch(request)
          .then((response) => {
            if (response.ok) {
              cache.put(request, response.clone());
            }
            return response;
          })
          .catch(() => cache.match(request))
      )
    );
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match('/offline').then((cached) =>
          cached || new Response(
            '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Offline</title><style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0f172a;color:#e2e8f0;text-align:center}h1{font-size:1.5rem;margin-bottom:1rem}p{opacity:.7}</style></head><body><div><h1>Du er offline</h1><p>Koble til internett for \u00e5 fortsette.</p></div></body></html>',
            { headers: { 'Content-Type': 'text/html' } }
          )
        )
      )
    );
    return;
  }
});

self.addEventListener('push', (event) => {
  let data = { title: 'Klarpakke', body: 'Du har en ny varsling', url: '/' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch { /* use defaults */ }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      data: { url: data.url },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
