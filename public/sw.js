/*
 * PACE RUN service worker.
 *
 * Strategy:
 *  - navigation: network first (4s timeout) so a fresh deploy always wins, then the cached
 *    page, then the offline page;
 *  - same-origin static files and fonts: stale-while-revalidate;
 *  - anything else (server functions, non-GET) is left untouched.
 *
 * Bump CACHE_VERSION on every release: activation drops the previous caches.
 */
const CACHE_VERSION = "pacerun-v3";
const PRECACHE = `${CACHE_VERSION}-precache`;
const RUNTIME = `${CACHE_VERSION}-runtime`;
const OFFLINE_URL = "/offline.html";
const NAVIGATION_TIMEOUT_MS = 4000;

const ESSENTIALS = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/favicon.ico",
  "/favicon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-192.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PRECACHE);
      await cache.addAll(ESSENTIALS);
      // App shells are optional: a failed fetch here must not block the install.
      await Promise.all(["/", "/inicio"].map((url) => cache.add(url).catch(() => undefined)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("pacerun-") && key !== PRECACHE && key !== RUNTIME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

function isFont(url) {
  return url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
}

function isStatic(request, url) {
  if (request.destination === "script" || request.destination === "style") return true;
  if (request.destination === "font" || request.destination === "image") return true;
  return url.pathname.startsWith("/assets/") || url.pathname.startsWith("/icons/");
}

// Shell pages live in the precache; runtime pages live in the runtime cache. Search both.
async function cachedPage(request) {
  return (
    (await caches.match(request, { ignoreSearch: true })) ||
    (await caches.match("/inicio", { ignoreSearch: true })) ||
    (await caches.match("/", { ignoreSearch: true })) ||
    (await caches.match(OFFLINE_URL))
  );
}

async function networkFirst(request) {
  const cache = await caches.open(RUNTIME);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NAVIGATION_TIMEOUT_MS);
  try {
    const response = await fetch(request, { signal: controller.signal });
    if (response && response.ok) {
      cache.put(request, response.clone());
      return response;
    }
    // 5xx from a proxy or a cold server means "offline" for caching purposes; 4xx is a
    // real answer from the app and must reach the user.
    if (!response || response.status >= 500) return (await cachedPage(request)) || response;
    return response;
  } catch {
    return (await cachedPage(request)) || Response.error();
  } finally {
    clearTimeout(timer);
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response && (response.ok || response.type === "opaque"))
        cache.put(request, response.clone());
      return response;
    })
    .catch(() => undefined);
  return cached || (await network) || Response.error();
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.origin === self.location.origin) {
    if (isStatic(request, url)) {
      event.respondWith(staleWhileRevalidate(request));
      return;
    }
    if (url.pathname === OFFLINE_URL || url.pathname === "/manifest.webmanifest") {
      event.respondWith(staleWhileRevalidate(request));
    }
    return;
  }

  if (isFont(url)) event.respondWith(staleWhileRevalidate(request));
});
