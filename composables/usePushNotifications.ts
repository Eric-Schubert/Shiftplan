import { confirmedPushState, urlBase64ToUint8Array, type PushState } from "~/utils/push-subscription";

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

/** A subscription for the given server key; an old one with a different key blocks a new one, so it is removed first. */
async function subscribeWithKey(publicKey: string): Promise<PushSubscription> {
  const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  await navigator.serviceWorker.ready;
  const options = { userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) };
  try {
    return await registration.pushManager.subscribe(options);
  } catch {
    await (await registration.pushManager.getSubscription())?.unsubscribe();
    return registration.pushManager.subscribe(options);
  }
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

    // Only the plan page loads the viewer status; the legal and settings pages need it here for the gate and the key.
    if (!viewerStatus.value) await loadViewerStatus().catch(() => null);

    // Registered again on every visit, as a new access code removes all subscriptions on the server. The bell
    // says "on" only once the server took it; a subscription made with an older server key is replaced once.
    state.value = await confirmedPushState({
      subscription: await getSubscription(),
      publicKey: viewerStatus.value?.pushPublicKey,
      hasAccess: viewerStatus.value?.hasAccess !== false,
      save: saveSubscription,
      renew: subscribeWithKey,
    });
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

    const subscription = await subscribeWithKey(publicKey);
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
