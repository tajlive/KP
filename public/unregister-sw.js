// Emergency Service Worker Unregister Script
// This script forcibly removes any registered service workers
// to fix redirect blocking issues

(function() {
  'use strict';
  
  if (typeof navigator === 'undefined' || !navigator.serviceWorker) {
    return;
  }
  
  // Unregister all service workers
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    registrations.forEach(function(registration) {
      registration.unregister().then(function(success) {
        console.log('[SW Unregister] Success:', success);
      }).catch(function(error) {
        console.error('[SW Unregister] Error:', error);
      });
    });
  });
  
  // Also clear any caches
  if (window.caches) {
    caches.keys().then(function(cacheNames) {
      cacheNames.forEach(function(cacheName) {
        caches.delete(cacheName);
      });
    });
  }
})();
