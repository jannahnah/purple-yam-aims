self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
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

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// This listener must be registered at the service-worker top level,
// not inside the push event, because dashboard notifications are shown
// directly with registration.showNotification() and do not dispatch "push".
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
