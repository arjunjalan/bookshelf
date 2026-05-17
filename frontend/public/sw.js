// M1: minimal pass-through service worker.
// Caching strategy added in M2.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))
