/**
 * Query parameters the planner can be opened with: ?year&week from push notifications,
 * ?einladung from personal invite links, ?zugang from QR codes and ?anfragen from request pushes.
 */
export function usePlannerDeepLinks(redeemAccessCode: (code: string) => Promise<void>) {
  const appStore = useAppStore();
  const route = useRoute();
  const router = useRouter();

  // Push notifications link to the changed week.
  const linkedYear = Number(route.query.year);
  const linkedWeek = Number(route.query.week);
  if (Number.isInteger(linkedYear) && Number.isInteger(linkedWeek) && linkedWeek >= 1 && linkedWeek <= 53) {
    appStore.setWeek(linkedYear, linkedWeek);
  }

  // A personal invite link works in the app and, after asking, in the browser too.
  const inviteCode = ref(typeof route.query.einladung === "string" ? route.query.einladung : null);

  // QR codes carry the access code as ?zugang=…; it is removed from the address bar right away.
  async function redeemLinkedCode() {
    const code = route.query.zugang;
    if (typeof code !== "string" || !code) return;

    const { zugang: _removed, ...query } = route.query;
    await router.replace({ query });
    await redeemAccessCode(code);
  }

  onMounted(() => {
    if (inviteCode.value) {
      const { einladung: _invite, ...query } = route.query;
      void router.replace({ query });
    }
    void redeemLinkedCode();
    // Pushes about requests link to /?anfragen=1.
    if (route.query.anfragen !== undefined) {
      const { anfragen: _requests, ...query } = route.query;
      void router.replace({ query });
      void nextTick(() => document.getElementById("anfragen")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  });

  return { inviteCode };
}
