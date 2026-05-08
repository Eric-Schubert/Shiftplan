export default defineNuxtPlugin(() => {
  const router = useRouter();
  let lastTrackedPath = "";
  let lastTrackedAt = 0;

  function track(path: string) {
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
