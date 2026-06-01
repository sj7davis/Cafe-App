/**
 * B1 Platform — Service Worker Push Handler
 * Handles push events and shows native browser notifications.
 * This file is imported by the Workbox-generated sw.js via importScripts.
 */

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'B1 Platform', body: event.data.text() };
  }

  const { title = 'B1 Platform', body = '', tag, url, icon } = payload;

  const options = {
    body,
    tag: tag || 'b1-notification',
    icon: icon || '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: { url: url || '/' },
    actions: url ? [{ action: 'open', title: 'Open' }] : [],
    requireInteraction: tag === 'new-order', // keep new order notifications visible
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a window is already open, focus it and navigate
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
