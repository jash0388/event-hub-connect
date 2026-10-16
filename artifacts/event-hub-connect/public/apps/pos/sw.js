/**
 * The register must OPEN without a network, not just keep running: a tablet
 * that rebooted during an outage is exactly the moment the offline promise
 * matters most. This worker caches the built shell and a copy of the Puter
 * SDK so the app boots from disk; the data layer then falls back to its own
 * local snapshot (see store.initFromBootCache).
 *
 * Strategies, deliberately boring:
 *  - navigations: network first (4 s), cached shell as the fallback - so an
 *    update always activates on the next load, never mid-sale, and an
 *    outage (or the host answering 5xx) serves the last shell that worked;
 *    the cached shell is only ever swapped atomically with its bundles
 *    (see commitShell), so an offline boot always finds a complete app;
 *  - hashed bundles under ./assets/: cache first - Vite hashes them, they
 *    never change;
 *  - other same-origin files (manifest, icons): cached copy at once,
 *    refreshed behind it - their names never change, so cache-first would
 *    freeze the first-ever copy for the life of the install;
 *  - the Puter SDK (that exact URL): cached copy first, refreshed in the
 *    background;
 *  - everything else (Puter API traffic): straight to the network, never
 *    intercepted.
 */

// Bumping the name makes existing installs re-cache everything and drop the
// old cache on activate. v3: shell updates became atomic (bundles cached
// before the shell that references them), which also started pruning the
// bundles earlier versions accumulated across deploys.
const CACHE = 'pos-shell-v3';
const SDK_URL = '/datanauts-bridge.js';
const CORE = [
  './',
  './manifest.json',
  './favicon.ico',
  './favicon-32x32.png',
  './favicon-16x16.png',
  './apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
];

const withTimeout = (promise, ms) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('timed out')), ms);
  promise.then(
    (value) => { clearTimeout(timer); resolve(value); },
    (err) => { clearTimeout(timer); reject(err); }
  );
});

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(CORE);
    // Cross-origin script: a no-cors request stores an opaque copy that a
    // <script src> can still execute offline.
    await cache.put(SDK_URL, await fetch(new Request(SDK_URL, { mode: 'no-cors' })));
    // The hashed bundle files are all referenced from the shell page itself.
    const html = await (await cache.match('./')).text();
    const assets = [...html.matchAll(/"(\.\/assets\/[^"]+)"/g)].map((m) => m[1]);
    if (assets.length) await cache.addAll(assets);
    // Safe to take over at once: this worker is a cache layer, not app code -
    // pages keep the bundle they booted with until their next load.
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key !== CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

/**
 * Swap the cached shell only after every hashed bundle it references is
 * cached alongside it. Caching the fresh HTML first and letting the page
 * fetch its bundles afterwards left a window - a connection lost between
 * the two, mid-deploy - where every offline boot served a shell whose
 * script didn't exist: a register that couldn't open, the one failure this
 * worker exists to prevent. Bundles nothing references anymore are pruned
 * only after the new shell is committed, so the cache stops accumulating a
 * pair per deploy without ever dropping one the current shell needs.
 */
async function commitShell(fresh) {
  const cache = await caches.open(CACHE);
  const html = await fresh.clone().text();
  const assets = [...html.matchAll(/"(\.\/assets\/[^"]+)"/g)].map((m) => m[1]);
  const wanted = new Set(assets.map((u) => new URL(u, self.location).href));
  await Promise.all(assets.map(async (url) => {
    if (await cache.match(url)) return;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`asset ${url}: ${res.status}`);
    await cache.put(url, res);
  }));
  await cache.put('./', fresh);
  for (const req of await cache.keys()) {
    if (req.url.includes('/assets/') && !wanted.has(req.url)) await cache.delete(req);
  }
}

/** Commits are serialized: two racing navigations across a deploy boundary
    could otherwise prune the assets the other's shell is about to need. */
let shellQueue = Promise.resolve();
function queueShellCommit(fresh) {
  const run = () => commitShell(fresh).catch(() => { /* the old shell stays whole */ });
  shellQueue = shellQueue.then(run, run);
  return shellQueue;
}

/** Fresh shell when the network answers; the cached one when it can't. */
async function navigate(request, holdOpen) {
  const cache = await caches.open(CACHE);
  const cachedShell = async () => (await cache.match(request)) || (await cache.match('./'));
  try {
    const fresh = await withTimeout(fetch(request), 4000);
    if (fresh && fresh.ok) {
      holdOpen(queueShellCommit(fresh.clone()));
      return fresh;
    }
    // The host answering 5xx (an outage, a deploy window) is as useless to
    // the register as no answer: a device holding a good shell shows the
    // shell, not the host's error page. 4xx keeps meaning what it says.
    if (fresh && fresh.status >= 500) {
      const hit = await cachedShell();
      if (hit) return hit;
    }
    return fresh;
  } catch {
    const hit = await cachedShell();
    if (hit) return hit;
    throw new Error('offline with no cached shell');
  }
}

/** Hashed bundles never change; the first fetch of each is also the last. */
async function immutable(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const fresh = await fetch(request);
  if (fresh.ok) cache.put(request, fresh.clone());
  return fresh;
}

/**
 * Unhashed files (manifest, favicons, icons): the cached copy answers at
 * once, a background refresh keeps it current. This worker's own bytes
 * rarely change, so install doesn't re-run per deploy - cache-first here
 * would pin the very first icons a device ever saw, forever.
 */
async function revalidated(request) {
  const cache = await caches.open(CACHE);
  const refresh = fetch(request)
    .then((fresh) => {
      if (fresh.ok) cache.put(request, fresh.clone());
      return fresh;
    })
    .catch(() => null);
  const hit = await cache.match(request);
  if (hit) return hit;
  const fresh = await refresh;
  if (fresh) return fresh;
  throw new Error('offline and not yet cached');
}

/** The SDK boots from cache and refreshes behind the running app. */
async function sdk() {
  const cache = await caches.open(CACHE);
  const refresh = fetch(new Request(SDK_URL, { mode: 'no-cors' }))
    .then((fresh) => {
      cache.put(SDK_URL, fresh.clone());
      return fresh;
    })
    .catch(() => null);
  const hit = await cache.match(SDK_URL);
  if (hit) return hit;
  const fresh = await refresh;
  if (fresh) return fresh;
  throw new Error('SDK unreachable and not yet cached');
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (request.mode === 'navigate') {
    // waitUntil keeps the worker alive while the shell commit finishes
    // behind the response - respondWith alone would let it be killed
    // mid-write.
    event.respondWith(navigate(request, (p) => event.waitUntil(p)));
    return;
  }
  // Exactly the SDK entry, not the prefix: anything else the SDK loads from
  // under its path must fetch its own bytes, not be answered with a cached
  // copy of the loader.
  if (request.url === SDK_URL) {
    event.respondWith(sdk());
    return;
  }
  const url = new URL(request.url);
  if (url.origin === self.location.origin) {
    event.respondWith(url.pathname.includes('/assets/') ? immutable(request) : revalidated(request));
  }
  // Anything else - Puter API calls above all - goes straight through.
});
