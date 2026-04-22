// ============================================================
// SERVICE WORKER — OSE Interlinear Viewer
// ============================================================
//
// STRATEGY: Cache-first with immediate update activation.
//
// HOW UPDATES WORK:
//   1. index.html calls registration.update() on every page load.
//      This makes the browser fetch sw.js from the server and
//      compare it byte-for-byte to the installed copy.
//   2. When you deploy changes, update CACHE_VERSION below to
//      the current date/time. That changes this file, so the
//      browser installs the new SW alongside the old one.
//   3. skipWaiting() in the install handler makes the new SW
//      activate immediately instead of waiting for all tabs to
//      close — preventing the "stuck old version" problem.
//   4. On activation, all caches with a different name are
//      deleted, so stale files are purged automatically.
//   5. clients.claim() makes the newly activated SW take
//      control of all open pages right away.
//
// Result: on the user's next page load after a deploy, they
// get the updated SW. On the load after that, they get the
// freshly cached files. The app stays current without the
// user ever needing to clear their cache manually.
//
// OFFLINE BEHAVIOR:
//   All app shell files are pre-cached on install. Every
//   request is served from cache first, so the app loads
//   instantly and works with no connection at all. If a file
//   is not in cache and the network is unavailable, the
//   browser's default offline error is shown — but all
//   critical pages are in the pre-cache so this should
//   never happen for normal app use.
//
//   User .onestory data files are NOT cached — they are
//   loaded dynamically by the user's file picker and are
//   not part of the app shell.
// ============================================================

// *** UPDATE THIS STRING ON EVERY DEPLOY ***
// Any change here changes this file, which triggers a fresh
// SW install and cache replacement for all users on next load.
const CACHE_VERSION = '2026-04-22T15:11:18Z';
const CACHE_NAME = 'ose-interlinear-' + CACHE_VERSION;

// All files that make up the app shell.
// Add any new HTML pages or assets here when you create them.
const APP_SHELL = [
  './',
  './index.html',
  './xlingpaper.html',
  './html.html',
  './tsv.html',
  './flextext.html',
  './styles.css',
  './ext-links.js',
  './renderer.js',
  './sw.js',
];

// INSTALL: fetch and cache all app shell files.
// skipWaiting() bypasses the "waiting" state — the new SW
// activates immediately even if old pages are still open.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// ACTIVATE: delete every cache whose name doesn't match
// CACHE_NAME. This removes stale files from previous deploys
// and prevents unbounded storage growth on the user's device.
// clients.claim() makes this SW take control of all open
// pages immediately rather than waiting for a navigation.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// FETCH: serve from cache first for instant loads and offline use.
// On a cache miss, try the network and cache the response for
// future offline use (dynamic caching of any uncached resources).
//
// Only GET requests are handled — POST and others pass through
// to the network normally.
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        // Cache hit — return immediately. Fast and works offline.
        return cached;
      }

      // Cache miss — try the network.
      return fetch(event.request).then(response => {
        // Dynamically cache valid same-origin responses so they're
        // available offline next time (e.g. if a new file was added
        // after the SW installed and before the next update).
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Network failed and nothing in cache.
        // All app shell files are pre-cached, so this only happens
        // for requests outside the app shell (e.g. external URLs),
        // which we can't do anything about anyway.
      });
    })
  );
});
