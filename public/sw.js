// EMERGENCY: Service Worker Disabled
// This SW does nothing - all fetch handling is bypassed
// To fix redirect loop issues

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Claim clients immediately
  event.waitUntil(self.clients.claim());
  
  // Clean up all old caches
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => caches.delete(key)))
    )
  );
});

// EMERGENCY: Do NOT intercept any fetches
// Let the browser handle all requests normally
self.addEventListener('fetch', (event) => {
  // Pass through all requests without caching
  // This prevents "script behind redirect" errors
  return;
});
