// Klarpakke Service Worker v5
// Cache-first for static assets, network-first for API, offline fallback
// FIXED: Never cache redirect responses, skip SW for Next.js assets

const CACHE_NAME = 'klarpakke-v5';
const STATIC_CACHE = 'klarpakke-static-v5';
const API_CACHE = 'klarpakke-api-v5';

const STATIC_ASSETS = [
  '/favicon.png',
  '/icons/icon-192x192.svg',
  '/icons/icon-512x512.svg',
  '/manifest.json',
];

const OFFLINE_PAGE = '/offline.html';

// Install: pre-cache critical static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll([...STATIC_ASSETS, OFFLINE_PAGE])
    )
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== STATIC_CACHE && key !== API_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension, ws, etc.
  if (!url.protocol.startsWith('http')) return;

  // FIXED: Skip service worker entirely for Next.js assets
  // Next.js handles caching via filename hashing, and we must not intercept redirects
  if (url.pathname.startsWith('/_next/')) {
    event.respondWith(fetch(request));
    return;
  }

  // API routes: network-first with 3s timeout, cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithTimeout(request, API_CACHE, 3000));
    return;
  }

  // External API (market data): network-first, short cache
  if (
    url.hostname.includes('coingecko') ||
    url.hostname.includes('coinlore') ||
    url.hostname.includes('alternative.me')
  ) {
    event.respondWith(networkFirstWithTimeout(request, API_CACHE, 5000));
    return;
  }

  // Static assets (fonts, images, CSS, JS): cache-first
  // NOTE: /_next/ is already handled above
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff2?|ttf)$/)
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // HTML pages: network-first, offline fallback
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirstWithOfflineFallback(request));
    return;
  }

  // Default: network-first
  event.respondWith(networkFirstWithTimeout(request, CACHE_NAME, 3000));
});

// Push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title || 'Klarpakke', {
        body: data.body || '',
        icon: '/icons/icon-192x192.svg',
        badge: '/favicon.png',
        data: data.url ? { url: data.url } : undefined,
        tag: data.tag || 'default',
      })
    );
  } catch {
    // Ignore malformed push
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/no/dashboard';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(url));
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    })
  );
});

// --- Strategies ---

// FIXED: Only cache 200 OK responses, never cache redirects
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached && cached.status === 200) return cached;

  try {
    const response = await fetch(request, { redirect: 'follow' });
    // Only cache final 200 responses, never cache redirects
    if (response.ok && response.status === 200 && !response.redirected) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const stale = await caches.match(request);
    return stale || new Response('Offline', { status: 503 });
  }
}

async function networkFirstWithTimeout(request, cacheName, timeoutMs) {
  try {
    const response = await promiseWithTimeout(fetch(request), timeoutMs);
    // Only cache successful non-redirect responses
    if (response.ok && response.status === 200 && !response.redirected) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}

async function networkFirstWithOfflineFallback(request) {
  try {
    const response = await promiseWithTimeout(fetch(request), 4000);
    // Only cache successful non-redirect responses
    if (response.ok && response.status === 200 && !response.redirected) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return caches.match(OFFLINE_PAGE) || new Response('Offline', { status: 503 });
  }
}

function promiseWithTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms)),
  ]);
}
