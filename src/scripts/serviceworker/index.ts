self.addEventListener("fetch", (event: any) => {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

const CacheDataList = [
  "/",
  "index.html",
  "main.js",
];
self.addEventListener("install", (event: any) => {
  event.waitUntil(
    caches.open("app-cache")
    .then(cache => {
      return cache.addAll(CacheDataList);
    }),
  );
});

declare const clients: any;
self.addEventListener("activate", () => {
  clients.claim();
});