/* Generated at build time by vite.config.js. Do not edit. */
const CACHE = 'bookkeeping-v10gsc1z';
const SHELL = ["./","./index.html","./manifest.json","./favicon.ico","./favicon-16x16.png","./favicon-32x32.png","./favicon-48x48.png","./apple-touch-icon.png","./icon-192.png","./icon-512.png","./icon-maskable-512.png","./app-icon.png","./assets/index-Y31yui-2.js","./assets/account-BZRqj6h9.js","./assets/accounts-Jsww0oT5.js","./assets/banking-DZpOKjGF.js","./assets/combobox-DRopRPqu.js","./assets/common-BE-mSAEt.js","./assets/contact-Caexpz1S.js","./assets/contacts-BRlFSQM0.js","./assets/csv-CdlU-kBY.js","./assets/dialog-C__E7-wU.js","./assets/forms-D1b3ed0j.js","./assets/importer-Dvxg3MUc.js","./assets/item-Dh8RnDYA.js","./assets/items-DMk7oJWl.js","./assets/misc-Oebi6mAp.js","./assets/reconcile-BPXSm2kj.js","./assets/reports-QAlECIjq.js","./assets/rules-Bu-ISt4a.js","./assets/sales-BFoVVaYf.js","./assets/settings-CP85JtO7.js","./assets/store-DkcStMoS.js","./assets/table-0MbGmkHY.js","./assets/txnlist-ZPA3Q0A-.js","./assets/index-YHz5iddG.css"];
const SDK = '/datanauts-bridge.js';

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(SHELL.map((url) => cache.add(new Request(url, { cache: 'reload' })).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) if (name.startsWith('bookkeeping-') && name !== CACHE) await caches.delete(name);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(request);
        if (fresh.ok) (await caches.open(CACHE)).put('./index.html', fresh.clone());
        return fresh;
      } catch {
        return (await caches.match('./index.html')) || new Response('Offline', { status: 503 });
      }
    })());
    return;
  }
  if (request.url.startsWith(SDK)) {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        (await caches.open(CACHE)).put(request, response.clone());
        return response;
      } catch {
        return (await caches.match(request)) || Response.error();
      }
    })());
    return;
  }
  if (url.origin === self.location.origin) {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok && response.type === 'basic') (await caches.open(CACHE)).put(request, response.clone());
      return response;
    })());
  }
  /* Calls to the user's Puter cloud always go to the network. */
});
