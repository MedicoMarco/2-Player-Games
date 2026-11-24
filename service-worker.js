const CACHE_NAME = "play2gether-pwa-v18";
const APP_ROOT = new URL("./", self.registration.scope).href;
const NOTIFICATION_SCRIPT = new URL("notifications.js", APP_ROOT).href;
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
    const files = [APP_ROOT, NOTIFICATION_SCRIPT, ...FACTORY_ASSETS].map(url => new Request(url, { cache: "reload" }));
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
  if (!navigation && url.href !== NOTIFICATION_SCRIPT && !FACTORY_ASSETS.has(url.href)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cacheKey = navigation && url.searchParams.has("push") ? APP_ROOT : request;
    let response;
    try {
      response = await fetch(request);
      if (response.ok) {
        try {
          await cache.put(cacheKey, response.clone());
        } catch {
          // A working network response is still usable if cache storage is full.
        }
        return response;
      }
    } catch {
      // The precached application shell and script files remain available offline.
    }
    const cached = await cache.match(cacheKey);
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

const notificationCopy = {
  test: ["Play2Gether-Testmitteilung", "Systembenachrichtigungen funktionieren auf diesem Gerät."],
  invite: ["Spieleinladung", "Tippe, um die Einladung anzunehmen."],
  direct: ["Neue Direktnachricht", "Tippe, um den Chat zu öffnen."],
  group: ["Neue Gruppennachricht", "Tippe, um den Gruppenchat zu öffnen."],
  room: ["Neue Nachricht im Spielchat", "Tippe, um zum Spielchat zu wechseln."],
  peer: ["Neue Nachricht im Spielchat", "Tippe, um zum Spielchat zu wechseln."],
};

self.addEventListener("push", event => {
  let target;
  try { target = event.data.json(); } catch { return; }
  if (!target || !Object.hasOwn(notificationCopy, target.kind) || target.kind === "peer") return;
  const [title, body] = notificationCopy[target.kind];
  event.waitUntil(self.registration.showNotification(title, {
    body,
    icon: new URL("icons/icon-192.png", APP_ROOT).href,
    tag: [target.account, target.kind, target.sender || target.id].join(":"),
    data: target,
  }));
});

function deliverToOpenPage(client, target) {
  return new Promise(resolve => {
    const channel = new MessageChannel();
    const finish = result => {
      clearTimeout(timer);
      channel.port1.close();
      resolve(result);
    };
    const timer = setTimeout(() => finish(false), 700);
    channel.port1.onmessage = () => finish(true);
    client.postMessage({ type: "open-notification", target }, [channel.port2]);
  });
}

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = event.notification.data;
  if (!target || !Object.hasOwn(notificationCopy, target.kind) || target.kind === "test") return;
  event.waitUntil((async () => {
    const app = new URL(APP_ROOT);
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      const url = new URL(client.url);
      if (url.origin !== app.origin || ![app.pathname, app.pathname + "index.html"].includes(url.pathname)) continue;
      try {
        if (await deliverToOpenPage(client, target)) {
          await client.focus();
          return;
        }
      } catch {}
    }
    app.searchParams.set("push", target.kind);
    for (const key of ["account", "id", "sender", "ts"]) {
      if (target[key] !== undefined) app.searchParams.set(key, target[key]);
    }
    await self.clients.openWindow(app.href);
  })());
});
