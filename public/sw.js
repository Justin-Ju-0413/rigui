self.addEventListener('install', () => {
  self.__WB_MANIFEST
  self.skipWaiting()
})
self.addEventListener('activate', (event) => { event.waitUntil(self.clients.claim()) })
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(self.clients.matchAll({ type: 'window' }).then((clients) => {
    const client = clients.find((c) => 'focus' in c) ?? clients[0]
    if (client) return client.focus()
    return self.clients.openWindow('/')
  }))
})
