export default defineNuxtPlugin(() => {
  const router = useRouter();
  let lastTrackedPath = "";
  let lastTrackedAt = 0;

  function hasDoNotTrackEnabled() {
    const nav = navigator as Navigator & { msDoNotTrack?: string | null };
    const win = window as Window & { doNotTrack?: string | null };
    return [nav.doNotTrack, nav.msDoNotTrack, win.doNotTrack].includes("1");
  }

  function track(path: string) {
    if (hasDoNotTrackEnabled()) return;
    if (!path || path === "/settings" || path.startsWith("/settings/")) return;

    const now = Date.now();
    if (path === lastTrackedPath && now - lastTrackedAt < 30_000) return;

    lastTrackedPath = path;
    lastTrackedAt = now;

    const url = `/api/analytics/visit?path=${encodeURIComponent(path)}`;
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url);
      return;
    }

    void $fetch(url, { method: "POST" }).catch(() => {});
  }

  onNuxtReady(() => {
    track(router.currentRoute.value.path);
    router.afterEach((to) => {
      track(to.path);
    });
  });
});
