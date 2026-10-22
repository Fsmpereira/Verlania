// Verlânia · service worker: sempre tenta a internet primeiro (versão nova), e usa a cópia guardada se estiver sem conexão.
const C = "verlania-v3";
const ASSETS = ["/", "/index.html", "/manifest.json", "/favicon.ico", "/web-app-manifest-192x192.png", "/web-app-manifest-512x512.png"];
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(C).then((c) => Promise.all(ASSETS.map((a) => c.add(a).catch(() => {})))).then(() => self.skipWaiting())
  );
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((k) => Promise.all(k.filter((x) => x !== C).map((x) => caches.delete(x)))).then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", (e) => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin || u.pathname.startsWith("/api/")) return;
  e.respondWith(
    fetch(r)
      .then((res) => { if (res.ok) { const cp = res.clone(); caches.open(C).then((c) => c.put(r, cp)); } return res; })
      .catch(() => caches.match(r).then((m) => m || caches.match("/index.html")))
  );
});
