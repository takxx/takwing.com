const CACHE_PREFIX = "mahjong-";
const CACHE_NAME = `${CACHE_PREFIX}261122`;
const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",  
  "./mahjong.svg",  
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);

    // /snake/?lang=en → /snake/index.html
    if (request.mode === "navigate") {
      const path = url.pathname.endsWith("/")
        ? `${url.pathname}index.html`
        : url.pathname;

      const cached = await cache.match(
        new URL(path, self.location.origin).href
      );

      if (cached) return cached;
    }

    const cached = await cache.match(request, { ignoreSearch: true });
    return cached || fetch(request);
  })());
});