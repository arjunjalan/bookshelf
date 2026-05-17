const STATIC_CACHE = 'bookshelf-static-v1'
const API_CACHE = 'bookshelf-api-v1'
const IMAGE_CACHE = 'bookshelf-images-v1'
const KNOWN_CACHES = [STATIC_CACHE, API_CACHE, IMAGE_CACHE]
const OFFLINE_URL = '/offline.html'

// Hosts whose responses should be skipped (let the browser cache them)
const PASSTHROUGH_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com']

// ─── Lifecycle ──────────────────────────────────────────────────────────────

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(['/', OFFLINE_URL]))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !KNOWN_CACHES.includes(k)).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  )
})

// ─── Fetch routing ──────────────────────────────────────────────────────────

self.addEventListener('fetch', (e) => {
  const { request } = e
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Let the browser handle font CDNs natively
  if (PASSTHROUGH_HOSTS.includes(url.hostname)) return

  // Cover images from Open Library CDN: cache-first (covers rarely change)
  if (url.hostname === 'covers.openlibrary.org') {
    e.respondWith(cacheFirst(request, IMAGE_CACHE))
    return
  }

  // Cross-origin (our API on Render, or localhost:8000 in dev): network-first
  if (url.hostname !== self.location.hostname) {
    e.respondWith(networkFirst(request, API_CACHE))
    return
  }

  // Navigation requests (HTML pages): network-first; offline → app shell
  if (request.mode === 'navigate') {
    e.respondWith(navigateWithFallback(request))
    return
  }

  // Vite-hashed static assets (/assets/*) and public files: cache-first
  // Hashed filenames guarantee freshness — a new deploy produces new URLs
  if (url.pathname.startsWith('/assets/') || url.pathname.match(/\.(png|svg|ico|webp|woff2?)$/)) {
    e.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }
})

// ─── Strategy helpers ───────────────────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) cache.put(request, response.clone())
  return response
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  try {
    const response = await fetch(request)
    if (response.ok) cache.put(request, response.clone())
    return response
  } catch {
    const cached = await cache.match(request)
    return cached ?? Response.error()
  }
}

async function navigateWithFallback(request) {
  const cache = await caches.open(STATIC_CACHE)
  try {
    const response = await fetch(request)
    if (response.ok) cache.put(request, response.clone())
    return response
  } catch {
    // Try exact URL, then the root app shell, then the offline page
    return (
      (await cache.match(request)) ??
      (await cache.match('/')) ??
      (await cache.match(OFFLINE_URL)) ??
      Response.error()
    )
  }
}
