const CACHE_PREFIX = "games-";
const CACHE_NAME = `${CACHE_PREFIX}261122`;
const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./ico.svg",
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
  "./simon/index.html",
  "./slant/index.html",
  "./slot/index.html",
  "./snake/index.html",
  "./spin/index.html",
  "./sudoku/index.html",
  "./summer/index.html",
  "./untangle/index.html",
  "./vpoker/index.html",
  "./whackamole/index.html"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});
