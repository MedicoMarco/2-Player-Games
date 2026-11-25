const CACHE_NAME = "play2gether-pwa-v40";
const APP_ROOT = new URL("./", self.registration.scope).href;
const APP_ASSETS = new Set(["notifications.js", "poker.js", "card-chip-picker.js", "poker-table.js?v=3", "poker.css?v=2", "blackjack.js?v=2", "blackjack-online.js", "blackjack-table.js?v=2", "direct-chat.js?v=3", "direct-chat.css?v=2", "group-chat.js?v=2", "game-chat.js?v=2", "game-chat.css"]
  .map(name => new URL(name, APP_ROOT).href));
const FACTORY_ASSETS = new Set([
  "campaign.js?v=1",
  "story.js?v=1",
  "story-art.js?v=1",
  "catalog.js?v=15",
  "audio.js",
  "grid.js?v=4",
  "yard.js?v=1",
  "runtime.js?v=3",
  "telemetry.js",
  "drawing.js?v=8",
  "equipment.js?v=1",
  "transport.js?v=10",
  "layout.js?v=18",
  "terrain.js?v=12",
  "world.js?v=7",
  "game.js?v=29",
].map(name => new URL("factory-empire/" + name, APP_ROOT).href));

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const files = [APP_ROOT, ...APP_ASSETS, ...FACTORY_ASSETS].map(url => new Request(url, { cache: "reload" }));
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
  if (!navigation && !APP_ASSETS.has(url.href) && !FACTORY_ASSETS.has(url.href)) return;

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
  const [fallbackTitle, fallbackBody] = notificationCopy[target.kind];
  const {kind, account, id, sender, ts, author, channel, preview} = target;
  const isInvite = kind === "invite";
  let title = fallbackTitle;
  if (author) title = author + (isInvite ? " lädt dich ein" : channel ? " · " + channel : "");
  const actions = !isInvite && self.Notification?.maxActions > 0
    ? [{action: "reply", title: "Antworten"}]
    : [];
  event.waitUntil(self.registration.showNotification(title, {
    body: preview || fallbackBody,
    actions,
    icon: new URL("icons/icon-192.png", APP_ROOT).href,
    tag: [target.account, target.kind, target.sender || target.id].join(":"),
    data: {kind, account, id, sender, ts},
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
  if (!target || !Object.hasOwn(notificationCopy, target.kind)) return;
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
