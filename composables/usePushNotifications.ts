export type PushState = "loading" | "unsupported" | "needs-install" | "denied" | "off" | "on";

function urlBase64ToUint8Array(value: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const raw = atob((value + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index);
  return bytes;
}

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

async function getSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration("/");
  return (await registration?.pushManager.getSubscription()) || null;
}

async function saveSubscription(subscription: PushSubscription): Promise<void> {
  await $fetch("/api/push/subscribe", { method: "POST", body: subscription.toJSON() });
}

export function usePushNotifications() {
  const state = useState<PushState>("push-state", () => "loading");
  const dialogOpen = useState<boolean>("push-dialog-open", () => false);
  const { status: viewerStatus, load: loadViewerStatus } = useViewerAccess();

  async function detect(): Promise<void> {
    if (!import.meta.client) return;

    if (!isSupported()) {
      state.value = isIOS() && !isStandalone() ? "needs-install" : "unsupported";
      return;
    }
    if (Notification.permission === "denied") {
      state.value = "denied";
      return;
    }

    const subscription = await getSubscription();
    state.value = subscription ? "on" : "off";

    // Re-register silently: a new access code removes all subscriptions on the server.
    if (subscription && viewerStatus.value?.hasAccess !== false) {
      await saveSubscription(subscription).catch(() => {});
    }
  }

  async function enable(): Promise<void> {
    // Must be the first await so iOS still sees the user gesture.
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      state.value = permission === "denied" ? "denied" : "off";
      return;
    }

    const publicKey = viewerStatus.value?.pushPublicKey || (await loadViewerStatus()).pushPublicKey;
    if (!publicKey) {
      throw new Error("Kein Zugriff auf den Schichtplan");
    }

    const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;
    const options = { userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) };

    let subscription: PushSubscription;
    try {
      subscription = await registration.pushManager.subscribe(options);
    } catch {
      // An old subscription with a different server key blocks a new one.
      await (await registration.pushManager.getSubscription())?.unsubscribe();
      subscription = await registration.pushManager.subscribe(options);
    }

    await saveSubscription(subscription);
    state.value = "on";
  }

  async function disable(): Promise<void> {
    const subscription = await getSubscription();
    if (subscription) {
      await $fetch("/api/push/unsubscribe", {
        method: "POST",
        body: { endpoint: subscription.endpoint },
      }).catch(() => {});
      await subscription.unsubscribe();
    }
    state.value = "off";
  }

  return { state, dialogOpen, detect, enable, disable };
}
