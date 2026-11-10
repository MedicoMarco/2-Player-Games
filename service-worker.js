const CACHE_NAME = "play2gether-pwa-v1";
const APP_ROOT = new URL("./", self.registration.scope).href;

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      await cache.add(new Request(APP_ROOT, { cache: "reload" }));
    } catch (error) {
      // Installation should still complete; the page can be cached after its first visit.
    }
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

// Only navigation requests are handled here. API calls and game/network requests
// remain untouched, so live data continues to use the original network behavior.
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET" || request.mode !== "navigate") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const response = await fetch(request);
      if (response && response.ok) await cache.put(request, response.clone());
      return response;
    } catch (error) {
      return (await cache.match(request))
        || (await cache.match(APP_ROOT))
        || new Response("Diese App-Seite ist noch nicht offline gespeichert. Bitte einmal mit Internetverbindung öffnen.", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" }
        });
    }
  })());
});
