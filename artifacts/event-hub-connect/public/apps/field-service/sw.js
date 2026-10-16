/*
 * Offline support for the app shell. Data never goes through here: records
 * come from Puter and are cached by the app itself in IndexedDB.
 *
 * - Page loads: network first, falling back to the cached shell offline.
 * - Hashed build assets: cache first (their names change with every build),
 *   kept for the current release and the one before it.
 * - Other same-origin files (icons, manifest): stale while revalidate.
 * - Cross-origin requests (Puter's API and SDK) are never touched.
 */
const CACHE = 'field-service-v2';
// Build files go in one cache per release, numbered: a new release starts
// the next one, and those older than the release it replaced are dropped
// (tabs still open on that one may still load its files).
const ASSETS = 'field-service-assets-';
const SHELL = ['./', './index.html', './manifest.json', './icons/icon-192.png', './favicon.ico'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && !k.startsWith(ASSETS)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function releases() {
  return (await caches.keys())
    .filter((k) => k.startsWith(ASSETS))
    .map((k) => Number(k.slice(ASSETS.length)))
    .filter(Number.isInteger);
}

async function assetCache() {
  return caches.open(ASSETS + Math.max(0, ...(await releases())));
}

/** Keep a page load as the offline shell, and notice a new release. */
async function saveShell(res) {
  const cache = await caches.open(CACHE);
  const old = await cache.match('./index.html');
  const [page, before] = await Promise.all([res.clone().text(), old ? old.text() : null]);
  await cache.put('./index.html', res);
  if (before === null || page === before) return;
  const current = Math.max(0, ...(await releases()));
  await caches.open(ASSETS + (current + 1));
  await Promise.all((await releases()).filter((n) => n < current).map((n) => caches.delete(ASSETS + n)));
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // The team worker source is deployed from here and must always be current.
  if (url.pathname.includes('/worker/')) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Only the app itself becomes the offline shell, never an error page.
          if (res.ok) event.waitUntil(saveShell(res.clone()));
          return res;
        })
        .catch(() => caches.match('./index.html')),
    );
    return;
  }

  if (url.pathname.includes('/assets/')) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              event.waitUntil(assetCache().then((c) => c.put(req, copy)));
            }
            return res;
          }),
      ),
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((hit) => {
      const fresh = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || fresh;
    }),
  );
});
