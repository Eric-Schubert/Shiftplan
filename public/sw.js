// Service worker for push notifications only. The app itself is not cached offline.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "Shiftplan", {
      body: data.body || "",
      icon: "/android-chrome-192x192.png",
      data: { url: data.url || "/" },
    })
  );
});

function postJson(path, body) {
  return fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function serverKey() {
  const status = await (await fetch("/api/viewer/status")).json();
  if (!status.pushPublicKey) throw new Error("Kein Zugriff auf den Schichtplan");
  const raw = atob(status.pushPublicKey.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

// The browser renewed or dropped the subscription, e.g. after rotating its keys: subscribe
// again and tell the server, or pushes stop until the app is opened the next time.
// The current server key wins over the old one, which may predate a new VAPID key.
async function renewSubscription(oldSubscription, newSubscription) {
  const subscription =
    newSubscription ||
    (await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: await serverKey() }));
  const saved = await postJson("/api/push/subscribe", subscription.toJSON());
  // Without a saved replacement the old registration stays; the next page load tries again.
  if (!saved.ok) throw new Error(`Push-Abo nicht gespeichert (${saved.status})`);
  if (oldSubscription && oldSubscription.endpoint !== subscription.endpoint) {
    await postJson("/api/push/unsubscribe", { endpoint: oldSubscription.endpoint });
  }
}

self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(renewSubscription(event.oldSubscription, event.newSubscription));
});

// Only pages of this site: a push never sends the browser somewhere else.
function ownUrl(value) {
  const home = new URL("/", self.location.origin).href;
  try {
    const url = new URL(value || "/", self.location.origin);
    return url.origin === self.location.origin ? url.href : home;
  } catch {
    return home;
  }
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = ownUrl(event.notification.data?.url);

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (new URL(client.url).origin === self.location.origin && "focus" in client) {
          return client
            .focus()
            .then((focused) => focused.navigate(target))
            .catch(() => self.clients.openWindow(target));
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
