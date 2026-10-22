/* CUPS service worker. Bump VERSION on any release that changes /icons, /fonts or this file. */
const VERSION = "v2";
const SHELL = `cups-shell-${VERSION}`; // precached, never trimmed
const RUNTIME = `cups-runtime-${VERSION}`; // cache-first static files, trimmed to MAX_RUNTIME
const MAX_RUNTIME = 120;
const PRECACHE = [
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png",
  "/icons/apple-touch-icon.png",
];
// Hashed build assets and static media only. HTML and /api are never cached.
const CACHE_FIRST = /^\/(?:_next\/static|icons|fonts)\//;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL).then((cache) => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== SHELL && k !== RUNTIME).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === "/api" || url.pathname.startsWith("/api/")) return; // never cache the API

  if (request.mode === "navigate") {
    // Network-first and never stored: pages carry a per-request CSP nonce and user state.
    event.respondWith(
      fetch(request).catch(() => caches.match("/offline.html").then((r) => r || Response.error())),
    );
    return;
  }
  if (CACHE_FIRST.test(url.pathname)) event.respondWith(cacheFirst(event));
});

async function cacheFirst(event) {
  const hit = await caches.match(event.request);
  if (hit) return hit;
  const response = await fetch(event.request);
  // 200 implies ok; skips errors, redirects, partial (206) and opaque/cross-origin responses.
  if (response.status === 200 && response.type === "basic" && !response.redirected) {
    const copy = response.clone();
    event.waitUntil(store(event.request, copy));
  }
  return response;
}

async function store(request, response) {
  const cache = await caches.open(RUNTIME);
  await cache.put(request, response);
  const keys = await cache.keys(); // insertion order: oldest first
  if (keys.length > MAX_RUNTIME) await cache.delete(keys[0]);
}
