// Service Worker: Self-unregistering
// Replaces previous emergency no-op SW to avoid fetch handler overhead warnings.
// This SW unregisters itself and clears all caches on activate.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Clear all caches
      caches.keys().then((keys) =>
        Promise.all(keys.map((key) => caches.delete(key)))
      ),
      // Claim clients so this SW takes effect immediately
      self.clients.claim(),
    ]).then(() => {
      // Self-unregister — no fetch interception needed
      return self.registration.unregister();
    })
  );
});

// No fetch listener — browser handles all requests natively
