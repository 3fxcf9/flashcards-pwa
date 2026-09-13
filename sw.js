const CACHE_NAME = "flashcards-v1";

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/styles.css",
  "/js/due.js",
  "/js/loader.js",
  "/js/main.js",
  "/js/md5.js",
  "/js/storage.js",
  "/icons/favicon.ico",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(STATIC_ASSETS);
      await self.skipWaiting();
    }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        // console.log("[SW] Existing caches:", keys);
        return Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => {
              return caches.delete(key);
            }),
        );
      })
      .then(() => self.clients.claim())
      .then(() => {
        console.log("[SW] Activated");
      }),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") {
    return;
  }
  const url = new URL(request.url);

  if (url.pathname === "/flashcards.json") {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});

async function networkFirst(request) {
  try {
    // console.log(`[SW] ${request.pathname}: trying network`);

    const response = await fetch(request);

    // console.log(`[SW] ${request.pathname}: network response:`, response.status);

    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
      // console.log(`[SW] ${request.pathname}: cache updated`);
    }

    return response;
  } catch (error) {
    // console.log(`[SW] ${request.pathname}: network failed, trying cache`, error);
    const cached = await caches.match(request);
    if (cached) {
      // console.log(`[SW] ${request.pathname}: using cached version`);
      return cached;
    }
    // console.log(`[SW] ${request.pathname}: no cached version available`);

    return new Response(
      JSON.stringify({
        error: "offline",
        message: `${request.pathname} is not available offline yet.`,
      }),
      {
        status: 503,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);

  if (cached) {
    // console.log("[SW] Cache hit:", request.url);
    return cached;
  }

  // console.log("[SW] Cache miss:", request.url);
  try {
    const response = await fetch(request);
    // console.log("[SW] Network response:", request.url, response.status);

    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
      // console.log("[SW] Cached:", request.url);
    }
    return response;
  } catch (error) {
    // console.log("[SW] Network failed:", request.url, error);
    return new Response("Offline", {
      status: 503,
      statusText: "Offline",
    });
  }
}
