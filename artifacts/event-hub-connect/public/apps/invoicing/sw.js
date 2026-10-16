/* Generated at build time by vite.config.js — do not edit. */
const CACHE = 'invoicing-vrqw27g';
const SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./favicon.ico",
  "./favicon-16x16.png",
  "./favicon-32x32.png",
  "./favicon-48x48.png",
  "./apple-touch-icon.png",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png",
  "./assets/index-Ckf7dMda.js",
  "./assets/pdf-BV6dAiEu.js",
  "./assets/pdf-spec-KQzFlow1.js",
  "./assets/share-page-BumRowqr.js",
  "./assets/index-CSSRh8Jj.css"
];
/* The Puter SDK is loaded from its own origin. It is runtime-cached so an
   installed app has it offline, but nothing about the offline path may
   depend on it resolving: the app boots from its own local snapshot. */
const SDK = '/datanauts-bridge.js';

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // One at a time and forgiving: a single 404 must not leave the whole
    // install rejected and the app permanently uncached.
    await Promise.all(SHELL.map((url) => cache.add(new Request(url, { cache: 'reload' })).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith('invoicing-') && name !== CACHE) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  /* The app's own navigations: the cached shell first, so an offline launch
     paints instantly, with the network refreshing it in the background. */
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cached = await caches.match('./index.html');
      const fresh = fetch(request).then((response) => {
        if (response.ok) caches.open(CACHE).then((c) => c.put('./index.html', response.clone()));
        return response;
      }).catch(() => null);
      return cached || (await fresh) || new Response('Offline', { status: 503 });
    })());
    return;
  }

  /* The SDK: network first so it stays current, cache as the fallback. An
     opaque response is fine — it replays exactly as it arrived. */
  if (request.url.startsWith(SDK)) {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        const cache = await caches.open(CACHE);
        cache.put(request, response.clone());
        return response;
      } catch {
        return (await caches.match(request)) || Response.error();
      }
    })());
    return;
  }

  /* Everything else of ours: cache first (the file names are hashed, so a
     hit is never stale), then the network. */
  if (url.origin === self.location.origin) {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok && response.type === 'basic') {
        const cache = await caches.open(CACHE);
        cache.put(request, response.clone());
      }
      return response;
    })());
  }
  /* Anything else (the user's own cloud) goes to the network untouched:
     caching someone's billing data in a browser cache is not this app's
     decision to make — the opt-in snapshot is. */
});
