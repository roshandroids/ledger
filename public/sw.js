/* Ledger service worker: offline shell. Bump VERSION to drop old caches. */
const VERSION = 'ledger-v1'
const SHELL = '/index.html'

// Precache the build's own files so the first offline visit works.
async function precache() {
  const cache = await caches.open(VERSION)
  const html = await (await fetch(SHELL, { cache: 'reload' })).text()
  const assets = [
    ...html.matchAll(
      /(?:src|href)="(\/[^"]+\.(?:js|css|png|webp|svg|webmanifest))"/g,
    ),
  ].map((m) => m[1])
  const urls = new Set([SHELL, ...assets])
  // Lazy chunks (charts, Excel export) are named inside the main script.
  for (const js of [...urls].filter((u) => u.endsWith('.js'))) {
    const text = await (await fetch(js)).text()
    for (const m of text.matchAll(/assets\/[\w.-]+\.(?:js|css)/g))
      urls.add('/' + m[0])
  }
  for (const css of [...urls].filter((u) => u.endsWith('.css'))) {
    const text = await (await fetch(css)).text()
    for (const m of text.matchAll(/url\((\/assets\/[^)]+)\)/g)) urls.add(m[1])
  }
  await cache.addAll([...urls])
}

self.addEventListener('install', (e) => {
  e.waitUntil(precache().then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  const url = new URL(req.url)
  if (req.method !== 'GET' || url.origin !== location.origin) return
  if (req.mode === 'navigate') {
    // Fresh page when online, cached shell when not.
    e.respondWith(
      fetch(req).catch(() => caches.match(SHELL, { ignoreVary: true })),
    )
    return
  }
  // Hashed assets never change; everything else same-origin is cached on first use.
  e.respondWith(
    caches.match(req, { ignoreVary: true }).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) caches.open(VERSION).then((c) => c.put(req, res.clone()))
          return res
        }),
    ),
  )
})
