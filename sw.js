// Lift Log service worker: offline cache + rest-timer notifications.
const CACHE = "lift-log-v1";
const SHELL = ["./", "index.html", "app.js", "data.js", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Network first for our own files (so updates arrive), cache when offline.
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req).then(hit => hit || (req.mode === "navigate" ? caches.match("index.html") : undefined))));
});

// Rest timer: the page tells us when the rest ends. We wait here (waitUntil keeps the
// worker alive) and show the notification even if the app is in the background.
let pending = null;
self.addEventListener("message", e => {
  const d = e.data || {};
  if (d.type === "timer-start") {
    if (pending) pending.cancel();
    const ms = Math.max(0, d.endAt - Date.now());
    let timer, done;
    const p = new Promise(res => {
      done = res;
      timer = setTimeout(() => {
        pending = null;
        res(self.registration.showNotification(d.title || "Rest is over 💪", {
          body: d.body || "Time for your next set. Go!",
          tag: "rest-timer", renotify: true, requireInteraction: true,
          vibrate: [300, 120, 300, 120, 600],
          icon: "icons/icon-192.png", badge: "icons/icon-192.png",
          data: { tab: "timer" }
        }));
      }, ms);
    });
    pending = { cancel(){ clearTimeout(timer); done(); } };
    e.waitUntil(p);
  } else if (d.type === "timer-cancel") {
    if (pending) { pending.cancel(); pending = null; }
    e.waitUntil(self.registration.getNotifications({ tag: "rest-timer" }).then(ns => ns.forEach(n => n.close())));
  }
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  const tab = e.notification.data?.tab || "timer";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
    for (const c of list) { c.postMessage({ type: "open-tab", tab }); return c.focus(); }
    return self.clients.openWindow("./?tab=" + tab);
  }));
});
