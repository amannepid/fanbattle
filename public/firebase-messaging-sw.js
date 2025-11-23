// Firebase Cloud Messaging Service Worker
// This is required by FCM for push notifications

importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

// Initialize Firebase
// Note: Service workers can't access process.env, so we use the config directly
// These values are public and safe to include in the service worker
const firebaseConfig = {
  apiKey: 'AIzaSyByUEJonppg3Sh8UVaqBgqfcIu51sgm8nQ',
  authDomain: 'npl-fan-battle.firebaseapp.com',
  projectId: 'npl-fan-battle',
  storageBucket: 'npl-fan-battle.firebasestorage.app',
  messagingSenderId: '631136089590',
  appId: '1:631136089590:web:d5122b959dbf4ffcd743d7',
};

firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[FCM] Background message received:', payload);

  const notificationTitle = payload.notification?.title || payload.data?.title || 'NPL Fan Battle';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'You have a new notification',
    icon: payload.notification?.icon || '/logo.png',
    badge: payload.notification?.badge || '/logo.png',
    data: payload.data || {},
    tag: payload.data?.notificationId || `notification-${Date.now()}`,
    requireInteraction: false,
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[FCM] Notification clicked:', event);

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

