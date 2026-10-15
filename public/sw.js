const OFFLINE_CACHE = "purple-yam-offline-v1";
const OFFLINE_FALLBACK_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(OFFLINE_CACHE).then((cache) => cache.add(OFFLINE_FALLBACK_URL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((cacheName) => cacheName.startsWith("purple-yam-offline-") && cacheName !== OFFLINE_CACHE)
          .map((cacheName) => caches.delete(cacheName))
      )
    ).then(() => self.clients.claim())
  );
});

// Only provide a fallback for page navigations. API requests must never receive
// the offline HTML page, because callers could mistake it for a valid API response.
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin || request.mode !== "navigate") {
    return;
  }

  event.respondWith(
    fetch(request).catch(async () => {
      const cache = await caches.open(OFFLINE_CACHE);
      return (await cache.match(OFFLINE_FALLBACK_URL)) || Response.error();
    })
  );
});

self.addEventListener("push", (event) => {
  let data = {};

  try {
    if (event.data) {
      const raw = event.data.text();

      try {
        data = JSON.parse(raw);
      } catch {
        data = {
          title: "Purple Yam AIMS",
          body: raw,
        };
      }
    }
  } catch (error) {
    console.error("[Purple Yam AIMS] Failed to read push payload:", error);
  }

  const title =
    typeof data.title === "string" && data.title.trim()
      ? data.title
      : "Purple Yam AIMS";

  const options = {
    body:
      typeof data.body === "string" && data.body.trim()
        ? data.body
        : "You have a new inventory notification.",
    icon: "/purple-yam-favicon.svg",
    badge: "/purple-yam-favicon.svg",
    tag: "purple-yam-aims-notification",
    data: {
      url: typeof data.url === "string" ? data.url : "/",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Keep this listener at the service-worker top level. Dashboard notifications
// shown with registration.showNotification() do not dispatch a "push" event.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = new URL(
    event.notification.data?.url || "/",
    self.location.origin
  );

  if (targetUrl.origin !== self.location.origin) {
    return;
  }

  event.waitUntil(
    self.clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    }).then(async (clients) => {
      for (const client of clients) {
        if (new URL(client.url).origin === self.location.origin) {
          await client.navigate(targetUrl.href);
          return client.focus();
        }
      }

      return self.clients.openWindow(targetUrl.href);
    })
  );
});
