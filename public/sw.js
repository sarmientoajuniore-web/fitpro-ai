const CACHE = 'fitpro-js-v2'

// Archivos del shell que se cachean al instalar
const SHELL = ['/', '/inicio', '/rutinas', '/progreso']

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

// ── Recordatorios de agua ────────────────────────────────────────────────────

let _aguaMl   = 0  // ml bebidos hoy (la página lo actualiza en tiempo real)
let _aguaMeta = 0  // meta del día
let _timers   = [] // ids de setTimeout activos

const MENSAJES = [
  { title: '💧 ¡Hora de hidratarte!',  body: '¡Venga, un vaso de agua YA! No te hagas el duro 😤' },
  { title: '💧 ¡Bebe agua ahora!',     body: 'Llevas rato sin tomar nada. ¡30 segundos y un vaso, hazlo! 🥤' },
  { title: '💧 Aviso de hidratación',  body: 'Sí, tú. Ve por agua y vuelve. ¡Tus riñones te lo piden! 🙏' },
  { title: '💧 ¡Agua, no excusas!',    body: '¿Cuánto llevas hoy? Abre PorotoFit y dale al +250 ml 👊' },
  { title: '💧 ¡Última llamada!',      body: 'Queda poco del día. Cierra esa brecha antes de dormir 🌙' },
  { title: '💧 ¡El último, va!',       body: 'Un vaso más y cumples la meta. ¡No te rindas tan cerca! 💪' },
]

// Horarios del día en los que se manda recordatorio (hora local)
const HORARIOS = [8, 11, 13, 16, 18, 20]

function cancelarRecordatorios() {
  _timers.forEach(id => clearTimeout(id))
  _timers = []
}

function programarRecordatorios(mlBebidos, metaMl) {
  cancelarRecordatorios()
  _aguaMl   = mlBebidos
  _aguaMeta = metaMl

  const ahora = Date.now()

  HORARIOS.forEach((hora, idx) => {
    const objetivo = new Date()
    objetivo.setHours(hora, 0, 0, 0)
    const diff = objetivo.getTime() - ahora
    if (diff <= 0) return // esta hora ya pasó hoy

    const id = setTimeout(() => {
      if (_aguaMl >= _aguaMeta) return // meta ya alcanzada, no molestar
      const { title, body } = MENSAJES[idx % MENSAJES.length]
      self.registration.showNotification(title, {
        body,
        icon:     '/icons/icon-192',
        badge:    '/icons/icon-192',
        tag:      `fitpro-agua-${hora}`, // evita apilar la misma notificación
        renotify: true,
        data:     { url: '/inicio' },
      })
    }, diff)

    _timers.push(id)
  })
}

self.addEventListener('message', e => {
  const { type, mlBebidos, metaMl } = e.data ?? {}
  if (type === 'SCHEDULE_WATER') programarRecordatorios(mlBebidos, metaMl)
  if (type === 'UPDATE_AGUA')  { _aguaMl = mlBebidos; _aguaMeta = metaMl }
  if (type === 'CANCEL_WATER')  cancelarRecordatorios()
})

// Al pulsar la notificación, abre o enfoca la app
self.addEventListener('notificationclick', e => {
  e.notification.close()
  const url = e.notification.data?.url ?? '/inicio'
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
      const abierto = cs.find(c => new URL(c.url).pathname === url)
      return abierto ? abierto.focus() : self.clients.openWindow(url)
    })
  )
})
