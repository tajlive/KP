/**
 * Service Worker Decommission Script (v3)
 * This SW intentionally self-unregisters to clear any legacy caching.
 */
self.addEventListener('install', function() {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    self.registration.unregister().then(function() {
      return self.clients.matchAll({ type: 'window' });
    }).then(function(clients) {
      clients.forEach(function(client) {
        client.navigate(client.url);
      });
    })
  );
});

// Intentionally no fetch handler — this SW does not cache anything
