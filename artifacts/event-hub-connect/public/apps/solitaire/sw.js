// Offline runtime cache for Solitaire.
//
// No precache manifest here on purpose: Vite content-hashes every asset
// filename on each build, so a hand-written list of files to precache would
// go stale the moment a new build shipped, and generating one would mean
// adding a build plugin to solve what is otherwise a ~30-line problem.
// Instead: same-origin GETs are served cache-first and populated lazily as
// they're requested; navigations try the network first and fall back to
// whatever shell is cached, so a cold offline launch still boots.
//
// Registered from src/main.js, production builds only (import.meta.env.PROD)
// -- see that file for why.

// v2: the icon set and site.webmanifest were replaced in place, at the same
// unhashed filenames -- exactly the case where cacheFirst would otherwise
// keep serving a returning visitor the old artwork forever.
const CACHE = 'solitaire-v2';

self.addEventListener('install', () => {
  // Don't wait for old tabs to close before this version takes over the
  // fetch handler -- there is no in-flight state here worth preserving.
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      // Bump CACHE above to invalidate: every cache whose name isn't the
      // current one (i.e. every previous version) is dropped here, so an
      // old build's cached shell and hashed assets can never be served
      // once a new CACHE name has been deployed and activated.
      const names = await caches.keys();
      await Promise.all(names.filter(name => name !== CACHE).map(name => caches.delete(name)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;

  // Only same-origin GETs are ever cached. This is what keeps js.puter.com
  // (auth/session-bearing, cross-origin) out of the cache entirely -- it is
  // never intercepted, let alone stored, so a signed-in session is never
  // served stale or offline from here.
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstShell(event));
    return;
  }

  event.respondWith(cacheFirst(event));
});

async function networkFirstShell(event) {
  const { request } = event;
  const cache = await caches.open(CACHE);
  try {
    const fresh = await fetch(request);
    // event.waitUntil, not a bare await: the browser is free to kill this
    // worker the instant respondWith()'s promise resolves, and an
    // un-awaited cache.put() can be silently dropped mid-write. That would
    // matter most right here -- this is the shell write the offline
    // fallback below depends on -- so keep the worker alive for it instead
    // of making the navigation wait on it.
    //
    // Same guard cacheFirst already has, and for the same reason: a
    // transient 502/404 error page must never overwrite a known-good
    // cached shell, since that write is exactly what a future offline cold
    // launch falls back to. !fresh.redirected too -- a navigation's redirect
    // mode is 'manual', so handing a redirected response back to
    // respondWith() throws; harmless on a static root deploy today, but
    // it's the classic PWA footgun and the guard costs nothing.
    if (fresh.ok && !fresh.redirected) event.waitUntil(cache.put(request, fresh.clone()));
    return fresh;
  } catch {
    // Offline (or the network genuinely failed): fall back to this exact
    // navigation URL if it was cached before, and otherwise to the app
    // shell at scope root, which every prior online visit will have cached
    // as part of loading the page at all.
    const cached =
      (await cache.match(request)) || (await cache.match(self.registration.scope));
    return cached || Response.error();
  }
}

async function cacheFirst(event) {
  const { request } = event;
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const fresh = await fetch(request);
    // Same reasoning as networkFirstShell: keep the worker alive for the
    // write via waitUntil rather than awaiting it inline, so the response
    // isn't delayed by the cache write.
    if (fresh && fresh.ok) event.waitUntil(cache.put(request, fresh.clone()));
    return fresh;
  } catch {
    return Response.error();
  }
}
