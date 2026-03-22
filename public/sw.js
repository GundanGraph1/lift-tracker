// Grindset Service Worker — push notifications + offline cache
const CACHE_NAME = 'grindset-v1'
const STATIC_ASSETS = ['/', '/favicon.ico', '/web-app-manifest-192x192.png']

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  )
})

// Network-first strategy for pages, cache-first for static assets
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  // Skip non-http(s) schemes (chrome-extension://, etc.), non-GET, and Supabase API calls
  if (!url.protocol.startsWith('http')) return
  if (e.request.method !== 'GET' || url.hostname.includes('supabase')) return

  // Static assets: cache-first
  if (url.pathname.match(/\.(js|css|png|jpg|svg|ico|woff2?)$/)) {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone))
        }
        return res
      }))
    )
    return
  }

  // Pages: network-first with cache fallback
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok) {
        const clone = res.clone()
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone))
      }
      return res
    }).catch(() => caches.match(e.request))
  )
})

// Push notification handler
self.addEventListener('push', (e) => {
  const data = e.data ? e.data.json() : {}
  const title = data.title || '\ud83c\udfcb\ufe0f Grindset'
  const options = {
    body: data.body || 'C\'est l\'heure de s\'entra\u00eener !',
    icon: '/web-app-manifest-192x192.png',
    badge: '/favicon-96x96.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' },
  }
  e.waitUntil(self.registration.showNotification(title, options))
})

// Click on notification → open app
self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  e.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      if (clients.length > 0) return clients[0].focus()
      return self.clients.openWindow(e.notification.data.url || '/')
    })
  )
})
