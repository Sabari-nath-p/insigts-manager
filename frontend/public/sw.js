/* Service worker for browser alerts delivered through Firebase Cloud Messaging.
   It only shows notifications and opens the site; it does not need the Firebase SDK. */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try {
    const message = event.data ? event.data.json() : {};
    // Firebase wraps our fields in a "data" object (or "notification" for display messages).
    data = message.data || message.notification || message;
  } catch (e) {
    data = { title: event.data ? event.data.text() : 'Insights' };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Insights', {
      body: data.body || '',
      tag: data.tag || undefined,
      icon: '/logo-mark.png',
      data: { url: data.url || '/dashboard' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/dashboard';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
