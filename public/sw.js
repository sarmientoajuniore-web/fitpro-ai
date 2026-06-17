const CACHE = 'fitpro-js-v1'

// Archivos del shell que se cachean al instalar
const SHELL = ['/', '/inicio', '/rutinas', '/nutricion', '/progreso']

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL).catch(() => {})) // silenciar si offline al instalar
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  const { request } = e
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // No interceptar llamadas a Supabase ni a otras APIs externas
  if (url.hostname !== self.location.hostname) return

  // Network-first: intenta red, cae a caché si no hay conexión
  e.respondWith(
    fetch(request)
      .then(res => {
        if (res.ok) {
          const clone = res.clone()
          caches.open(CACHE).then(c => c.put(request, clone))
        }
        return res
      })
      .catch(() => caches.match(request))
  )
})
