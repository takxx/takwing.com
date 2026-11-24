const CACHE_PREFIX = "games-";
const CACHE_NAME = `${CACHE_PREFIX}261124`;

const FILES_TO_CACHE = [
  "/2048/index.html",
  "/addoku/index.html",
  "/alquerque/index.html",
  "/brick/index.html",
  "/checkers/index.html",
  "/chromo/index.html",
  "/connect4/index.html",
  "/cow/index.html",
  "/dopewars/index.html",
  "/domino/index.html",
  "/fishprawncrab/index.html",
  "/freecell/index.html",
  "/froggy/index.html",
  "/hex/index.html",
  "/hockey/index.html",
  "/labyrinth/index.html",
  "/lightsout/index.html",
  "/mastermind/index.html",
  "/match/index.html",
  "/minesweeper/index.html",
  "/pachinko/index.html",
  "/pong/index.html",
  "/reversi/index.html",
  "/rummi/index.html",
  "/rushhour/index.html",
  "/sfcave/index.html",
  "/shikaku/index.html",
  "/simon/index.html",
  "/slant/index.html",
  "/slot/index.html",
  "/snake/index.html",
  "/spin/index.html",
  "/sudoku/index.html",
  "/summer/index.html",
  "/tangram/index.html",
  "/tangram/tan.svg",  
  "/untangle/index.html",
  "/vaca/index.html",
  "/vpoker/index.html",
  "/whackamole/index.html",
  "/games/index.html",
  "/games/ico.svg",
  "/juegos/index.html",
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