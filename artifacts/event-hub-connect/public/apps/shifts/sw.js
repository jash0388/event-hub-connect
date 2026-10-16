/**
 * App-shell service worker: network-first with a cache fallback, so the
 * installed PWA stays fresh online and still opens offline. Application
 * data lives in Puter KV with a localStorage mirror; this worker only
 * handles the shell (HTML, hashed assets, icons, manifest).
 */
const CACHE_PREFIX = 'shifts-shell-';
const CACHE = `${CACHE_PREFIX}v1`;
const PRECACHE = ['./', './manifest.json', './favicon.ico', './icons/icon-192.png', './icons/icon-512.png'];

/**
 * The shell references hashed JS/CSS bundles whose names aren't known
 * here, and on the very first visit they were fetched before this
 * worker controlled the page. Pull them out of the just-cached HTML so
 * one online visit is enough for the app to open offline. Best-effort:
 * if anything fails, runtime caching still fills the gap later.
 */
async function precacheShellAssets(cache) {
  const shell = await cache.match('./');
  if (!shell) return;
  const html = await shell.text();
  const assets = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)]
    .map((m) => m[1])
    .filter((url) => new URL(url, self.location.href).origin === self.location.origin);
  if (assets.length > 0) await cache.addAll(assets);
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then(async (cache) => {
        await cache.addAll(PRECACHE);
        await precacheShellAssets(cache).catch(() => {});
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      // Cache storage is shared by every app on this origin, even those
      // outside this worker's scope. Only clean up our own old shells.
      .then((keys) => Promise.all(
        keys.filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return; // Puter SDK and APIs pass through

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches
            .open(CACHE)
            .then((cache) => cache.put(request, copy))
            .catch(() => {});
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request, { ignoreSearch: request.mode === 'navigate' });
        if (cached) return cached;
        if (request.mode === 'navigate') {
          const shell = await caches.match('./');
          if (shell) return shell;
        }
        return Response.error();
      })
  );
});
