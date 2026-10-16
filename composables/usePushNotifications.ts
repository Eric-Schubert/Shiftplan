export type PushState = "loading" | "unsupported" | "needs-install" | "denied" | "off" | "on";

function urlBase64ToUint8Array(value: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const raw = atob((value + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index);
  return bytes;
}

/** Whether a subscription was made with the server's current key; one made with an older key never receives anything. */
export function subscribedWithKey(subscriptionKey: ArrayBuffer | null | undefined, publicKey: string): boolean {
  if (!subscriptionKey) return true;
  const current = urlBase64ToUint8Array(publicKey);
  const subscribed = new Uint8Array(subscriptionKey);
  return subscribed.length === current.length && subscribed.every((byte, index) => byte === current[index]);
}

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
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
  const { t } = useI18n();

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
    if (!subscription) {
      state.value = "off";
      return;
    }

    const publicKey = viewerStatus.value?.pushPublicKey;
    if (publicKey && !subscribedWithKey(subscription.options.applicationServerKey, publicKey)) {
      // Dropped, so the bell offers to set up a new one instead of claiming pushes that never come.
      await subscription.unsubscribe().catch(() => false);
      state.value = "off";
      return;
    }

    state.value = "on";
    // Re-register: a new access code removes all subscriptions on the server. If the server refuses it, it is not on.
    if (viewerStatus.value?.hasAccess !== false) {
      await saveSubscription(subscription).catch(() => (state.value = "off"));
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
      throw new Error(t("app.push.noAccess"));
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
