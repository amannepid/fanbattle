// Service Worker for Notification System
const CACHE_NAME = 'fanbattle-notifications-v1';
const STATIC_CACHE_NAME = 'fanbattle-static-v1';

// Install event
self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installing');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activating');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Push event (for FCM)
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received', event);

  let notificationData = {
    title: 'NPL Fan Battle',
    body: 'You have a new notification',
    icon: '/logo.png',
    badge: '/logo.png',
    data: {},
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      notificationData = {
        title: payload.notification?.title || payload.data?.title || notificationData.title,
        body: payload.notification?.body || payload.data?.body || notificationData.body,
        icon: payload.notification?.icon || '/logo.png',
        badge: payload.notification?.badge || '/logo.png',
        data: payload.data || {},
        tag: payload.data?.notificationId || `notification-${Date.now()}`,
      };
    } catch (error) {
      console.error('[SW] Error parsing push payload:', error);
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      data: notificationData.data,
      tag: notificationData.tag,
      requireInteraction: false,
    })
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked', event);

  event.notification.close();

  const data = event.notification.data || {};
  let url = '/';

  // Determine URL from notification data
  if (data.url) {
    url = data.url;
  } else if (data.matchId) {
    url = `/predict/${data.matchId}`;
  } else if (data.type === 'cutoff_reminder' && data.matchId) {
    url = `/predict/${data.matchId}`;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and navigate
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          if ('navigate' in client) {
            client.navigate(url);
          }
          return;
        }
      }

      // Otherwise, open a new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Background sync (optional, for offline support)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync event', event.tag);
  // Can be used for syncing notification preferences or retrying failed notifications
});

// Message event (for communication with main thread)
self.addEventListener('message', (event) => {
  console.log('[SW] Message received', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

