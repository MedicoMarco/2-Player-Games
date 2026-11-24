const CACHE_NAME = "play2gether-pwa-v13";
const APP_ROOT = new URL("./", self.registration.scope).href;
const FACTORY_ASSETS = new Set([
  "catalog.js?v=12",
  "audio.js",
  "grid.js",
  "runtime.js",
  "telemetry.js",
  "drawing.js?v=6",
  "transport.js?v=6",
  "layout.js?v=13",
  "game.js?v=13",
].map(name => new URL("factory-empire/" + name, APP_ROOT).href));

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const files = [APP_ROOT, ...FACTORY_ASSETS].map(url => new Request(url, { cache: "reload" }));
    await cache.addAll(files);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => key.startsWith("play2gether-pwa-") && key !== CACHE_NAME)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const navigation = request.mode === "navigate";
  if (!navigation && !FACTORY_ASSETS.has(url.href)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    let response;
    try {
      response = await fetch(request);
      if (response.ok) {
        try {
          await cache.put(request, response.clone());
        } catch {
          // A working network response is still usable if cache storage is full.
        }
        return response;
      }
    } catch {
      // The precached application shell and script files remain available offline.
    }
    const cached = await cache.match(request);
    if (cached) return cached;
    if (navigation) {
      const shell = await cache.match(APP_ROOT);
      if (shell) return shell;
    }
    return response || new Response("Die benötigte App-Datei ist offline nicht verfügbar.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  })());
});
