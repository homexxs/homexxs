// Service Worker for handling push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body || '',
    icon: '/icon.png',
    badge: '/badge.png',
    tag: data.tag || 'notification',
    requireInteraction: data.requireInteraction || false,
    data: data.data || {},
  };

  if (data.image) options.image = data.image;
  if (data.actions) options.actions = data.actions;

  event.waitUntil(
    self.registration.showNotification(data.title || 'HomeX', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/Dashboard';
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Check if window is already open
      for (let i = 0; i < clientList.length; i++) {
        if (clientList[i].url === url && 'focus' in clientList[i]) {
          return clientList[i].focus();
        }
      }
      // Open new window if not found
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
