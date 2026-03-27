/**
 * Push Notification Service Worker
 * Klarpakke Web Push API
 * 
 * This service worker handles:
 * - Push events from server
 * - Notification display
 * - Notification click handling
 * - Background sync (future)
 */

const CACHE_NAME = 'klarpakke-push-v1';

// ============================================
// INSTALL & ACTIVATE
// ============================================

self.addEventListener('install', (event) => {
  console.log('[Push SW] Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[Push SW] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// ============================================
// PUSH EVENTS
// ============================================

self.addEventListener('push', (event) => {
  console.log('[Push SW] Push received:', event);

  let data = {
    title: 'Klarpakke',
    body: 'Du har en ny varsling',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    url: '/',
    actions: [],
    requireInteraction: false,
    silent: false,
    timestamp: Date.now(),
  };

  try {
    if (event.data) {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    }
  } catch (error) {
    console.error('[Push SW] Error parsing push data:', error);
    // Use defaults
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    requireInteraction: data.requireInteraction,
    silent: data.silent,
    timestamp: data.timestamp,
    data: {
      url: data.url,
      actions: data.actions,
    },
    actions: data.actions || [],
    tag: data.tag || 'klarpakke-notification',
    renotify: false,
  };

  // iOS 16.4+ specific options
  if ('notification' in self.registration) {
    // @ts-ignore - iOS specific
    options.dir = 'auto';
    // @ts-ignore - iOS specific
    options.lang = 'no';
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// ============================================
// NOTIFICATION CLICK
// ============================================

self.addEventListener('notificationclick', (event) => {
  console.log('[Push SW] Notification clicked:', event);

  event.notification.close();

  const notificationData = event.notification.data || {};
  const url = notificationData.url || '/';
  const action = event.action;

  // Handle action buttons
  if (action) {
    const actions = notificationData.actions || [];
    const clickedAction = actions.find((a) => a.action === action);
    
    if (clickedAction && clickedAction.url) {
      event.waitUntil(openUrl(clickedAction.url));
      return;
    }
  }

  // Default: open main URL
  event.waitUntil(openUrl(url));
});

// ============================================
// HELPERS
// ============================================

async function openUrl(url) {
  const clients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });

  // Try to focus existing window
  for (const client of clients) {
    if (client.url.includes(url) && 'focus' in client) {
      await client.focus();
      // Send message to client to navigate
      client.postMessage({
        type: 'NOTIFICATION_CLICK',
        url: url,
      });
      return;
    }
  }

  // Open new window
  if (self.clients.openWindow) {
    await self.clients.openWindow(url);
  }
}

// ============================================
// MESSAGE HANDLING (from main thread)
// ============================================

self.addEventListener('message', (event) => {
  const data = event.data;

  if (!data || !data.type) return;

  switch (data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    
    case 'GET_VERSION':
      event.ports[0]?.postMessage({
        version: '1.0.0',
        cacheName: CACHE_NAME,
      });
      break;

    default:
      console.log('[Push SW] Unknown message type:', data.type);
  }
});

// ============================================
// BACKGROUND SYNC (for future use)
// ============================================

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-subscription') {
    console.log('[Push SW] Background sync:', event.tag);
    // Future: sync subscription state with server
  }
});

console.log('[Push SW] Service worker loaded');
