// Service worker TripPlan.
//
// Objectif principal : éviter les pages blanches après un déploiement. GitHub
// Pages sert index.html avec un cache HTTP (~10 min) : un HTML périmé gardé en
// cache navigateur référence des assets /assets/index-<hash>.js supprimés au
// déploiement suivant → le script 404 → React ne démarre jamais → page blanche.
// Les navigations passent donc d'abord par le réseau (network-first), avec
// repli sur le cache hors ligne. Les assets buildés sont hashés (immutables) :
// cache-first.
const CACHE = 'tripplan-v1'
// Préfixe de déploiement déduit du scope d'enregistrement (ex. /TripPlan/).
const BASE = new URL(self.registration.scope).pathname

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Navigations (documents HTML) : network-first, repli sur le cache hors ligne.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put(request, copy))
          return response
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match(`${BASE}index.html`))),
    )
    return
  }

  // Assets buildés (hashés dans le nom de fichier) : cache-first, puis réseau.
  if (url.pathname.includes('/assets/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone()
              caches.open(CACHE).then((cache) => cache.put(request, copy))
            }
            return response
          }),
      ),
    )
  }
})
