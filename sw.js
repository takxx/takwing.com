const CACHE_PREFIX = "games-";
const CACHE_NAME = `${CACHE_PREFIX}261123`;

const FILES_TO_CACHE = [
  "./",
  "./2048/index.html",
  "./addoku/index.html",
  "./alquerque/index.html",
  "./brick/index.html",
  "./cow/index.html",
  "./dopewars/index.html",
  "./fishprawncrab/index.html",
  "./freecell/index.html",
  "./froggy/index.html",
  "./hockey/index.html",
  "./labyrinth/index.html",
  "./lightsout/index.html",
  "./mastermind/index.html",
  "./match/index.html",
  "./pachinko/index.html",
  "./pong/index.html",
  "./sfcave/index.html",
  "./shikaku/index.html",
  "./simon/index.html",
  "./slant/index.html",
  "./slot/index.html",
  "./snake/index.html",
  "./spin/index.html",
  "./sudoku/index.html",
  "./summer/index.html",
  "./untangle/index.html",
  "./vpoker/index.html",
  "./whackamole/index.html",
  "./games/index.html",
  "./games/ico.svg"
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

  // Leave cross-origin requests to the browser/network.
  if (new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(request);

      if (cachedResponse) return cachedResponse;

      return fetch(request);
    })
  );
});
