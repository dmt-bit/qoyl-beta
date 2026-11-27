// Qoyl service worker
// Handles:
//   1. PWA install / offline caching (minimal — Next.js handles most of this)
//   2. Web Push notifications from the Qoyl backend

const CACHE_NAME = "qoyl-v1";

// ── Install / activate ────────────────────────────────────────────────────────

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Push event ────────────────────────────────────────────────────────────────
// Payload shape (JSON):
//   { title, body, icon?, badge?, url?, tag?, data? }

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "qoyl", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title ?? "qoyl";
  const options = {
    body: payload.body ?? "",
    icon: payload.icon ?? "/icons/icon-192.png",
    badge: payload.badge ?? "/icons/icon-192.png",
    tag: payload.tag ?? "qoyl-push",
    data: { url: payload.url ?? "/dashboard", ...(payload.data ?? {}) },
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification click ────────────────────────────────────────────────────────

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url ?? "/dashboard";
  const fullUrl = url.startsWith("http") ? url : `https://qoyl.live${url}`;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        // Focus an existing qoyl.live tab if one is open.
        for (const client of clients) {
          if (client.url.startsWith("https://qoyl.live") && "focus" in client) {
            client.navigate(fullUrl);
            return client.focus();
          }
        }
        // Otherwise open a new tab.
        return self.clients.openWindow(fullUrl);
      })
  );
});
