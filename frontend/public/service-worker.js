/* AgriFlow Push Service Worker */
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = { title: 'AgriFlow', body: 'Notifikasi baru' };
  try {
    if (event.data) data = event.data.json();
  } catch (e) {
    data.body = event.data ? event.data.text() : data.body;
  }
  const options = {
    body: data.body || '',
    icon: '/logo192.png',
    badge: '/logo192.png',
    tag: data.tag || 'agriflow-' + Date.now(),
    renotify: true,
    requireInteraction: false,
    vibrate: [200, 100, 200, 100, 200],
    timestamp: Date.now(),
    data: { url: data.url || '/' },
  };
  event.waitUntil(
    self.registration.showNotification(data.title || 'AgriFlow', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
