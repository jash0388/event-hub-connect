/*
 * Offline support for the app shell. Data never goes through here: records
 * come from Puter and are cached by the app itself in IndexedDB.
 *
 * - Page loads: network first, falling back to the cached shell offline.
 * - Requests that ask to revalidate (the team worker bundle): network first.
 * - Hashed build assets: cache first (their names change with every build).
 * - Other same-origin files (icons, manifest): stale while revalidate.
 * - Cross-origin requests (Puter's API and SDK) are never touched.
 */
const CACHE = 'childcare-v1';
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
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Only the app page itself becomes the offline shell, never an
          // error page or a file opened in a tab.
          if (res.ok && /text\/html/i.test(res.headers.get('content-type') || '')) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put('./index.html', copy));
          }
          return res;
        })
        .catch(() => caches.match('./index.html')),
    );
    return;
  }

  if (req.cache === 'no-cache' || req.cache === 'no-store' || req.cache === 'reload') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || Promise.reject(new TypeError('offline')))),
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
              caches.open(CACHE).then((c) => c.put(req, copy));
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
