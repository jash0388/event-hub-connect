/*
 * Offline support for the app shell. Data never goes through here: records
 * come from Puter and are cached by the app itself in IndexedDB.
 *
 * - Page loads: network first, falling back to the cached shell offline.
 * - Hashed build assets: cache first (their names change with every build).
 * - Other same-origin files (icons, manifest): stale while revalidate.
 * - The Puter SDK: network first, with a copy for starting offline.
 * - Other cross-origin requests (Puter's API) are never touched, and
 *   neither is the team worker source, which owners deploy from here.
 */
const SDK = '/datanauts-bridge.js';
// Filled in by the build (vite.config.js): this build's files, so the app
// opens offline after a single visit, and a cache per build, so the files
// of earlier builds are dropped.
const BUILD = '8df239da3f91';
const ASSETS = ["./assets/assignments-oir3IHXl.js","./assets/chart-CppRrwpc.js","./assets/common-Bwk-sKCF.js","./assets/contact-detail-XSAFZnmV.js","./assets/contact-form-BToHRVh7.js","./assets/contacts-JlFBtbY3.js","./assets/costs-CZKs6ikK.js","./assets/csv-CKyxhRj1.js","./assets/dashboard-BMib0gLe.js","./assets/documents-JSFaJSUF.js","./assets/expenses-WP4ecni2.js","./assets/failures-DJqRpRFV.js","./assets/form-CZ3b-9s7.js","./assets/fuel-1ASCGgE-.js","./assets/fuel-BPleL2gw.js","./assets/fuel-form-CkK9zdXk.js","./assets/grid-9H6q3WJ1.js","./assets/importers-DDFM97uf.js","./assets/index-C3Tl9ano.css","./assets/index-zBNZrYIp.js","./assets/inspection-detail-Oyl5xECq.js","./assets/inspection-form-builder-C5a16ryP.js","./assets/inspection-forms-BLMtXJRF.js","./assets/inspection-run-c5cXSotY.js","./assets/inspections-CE55FNdr.js","./assets/issue-detail-BrHjKOMY.js","./assets/issue-form-uO8rzlvi.js","./assets/issues-YT9i-fCj.js","./assets/line-items-4_4YGIuZ.js","./assets/meters-BDPUGPW6.js","./assets/onboarding-BlNfPD64.js","./assets/part-detail-CedaR2Hn.js","./assets/part-form-L1A2Aj04.js","./assets/parts-CznYTX7m.js","./assets/purchase-order-detail-8kpNUgLF.js","./assets/purchase-order-form-DNzdv40c.js","./assets/purchase-orders-C82zCLPa.js","./assets/reminder-detail-C_sTxO-N.js","./assets/reminder-form-BI-pwZbR.js","./assets/reminders-CRNfI68t.js","./assets/renewals-B32hqukN.js","./assets/report-DJuIBqcQ.js","./assets/report-defs-BRedn7ft.js","./assets/reports-CunqciMA.js","./assets/sample-DnILvYf2.js","./assets/sample-data-CpNxkW8L.js","./assets/service-BcVfpHje.js","./assets/service-detail-8ax4nmEK.js","./assets/service-doc-D1mxsGfV.js","./assets/service-form-DGG7-k5k.js","./assets/service-program-36S6gSGa.js","./assets/service-programs-BfYaG1BS.js","./assets/service-tasks-CUg3aT1n.js","./assets/settings-DuuAu1r_.js","./assets/vehicle-detail-y-PIsSwZ.js","./assets/vehicle-form-DDpy4e-d.js","./assets/vehicles-C3HThBIG.js","./assets/vendor-detail-BEzpmOtf.js","./assets/vendor-form-Y808_XSS.js","./assets/vendors-C6b1ShpR.js","./assets/work-order-detail-t2xbQ1Ye.js","./assets/work-orders-CMTKe0j5.js"];
const CACHE = `fleet-${BUILD}`;
const SHELL = ['./', './index.html', './manifest.json', './icons/icon-192.png', './favicon.ico'];

// This build's copy first: the previous build's cache is kept for a while,
// and caches.match() alone would find its older page and SDK first.
const cached = (req) => caches.open(CACHE).then((c) => c.match(req)).then((hit) => hit || caches.match(req));

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then(async (cache) => {
        await cache.addAll([...SHELL, ...ASSETS]);
        // The page loaded the SDK before this worker existed; keep a copy now.
        await fetch(SDK, { mode: 'no-cors' })
          .then((res) => cache.put(SDK, res))
          .catch(() => {});
      })
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      // Keep the previous build's files as well (keys come oldest first): a
      // tab still running it may open a screen it has not loaded yet.
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).slice(0, -1).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (req.url === SDK) {
    // Without it a signed-in person can't open their fleet offline.
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok || res.type === 'opaque') {
            const copy = res.clone();
            event.waitUntil(caches.open(CACHE).then((c) => c.put(SDK, copy)));
          }
          return res;
        })
        .catch(() => cached(SDK).then((hit) => hit || Response.error())),
    );
    return;
  }
  if (url.origin !== self.location.origin) return;
  // The team worker source is deployed from here and must always be current.
  if (url.pathname.includes('/worker/')) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Only the app page itself becomes the offline shell, never an
          // error page or another file opened in a tab.
          if (res.ok && /text\/html/i.test(res.headers.get('content-type') || '')) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put('./index.html', copy));
          }
          return res;
        })
        .catch(() => cached('./index.html')),
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
    cached(req).then((hit) => {
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
