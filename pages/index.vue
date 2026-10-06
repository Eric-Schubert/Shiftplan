<script setup lang="ts">
import type { ShiftWithStaff, WeeklyShiftplanWithPattern } from "~/types/shiftplan";
import type { Absence } from "~/types/absence";
import { useSwipe } from "~/composables/useSwipe";

const appStore = useAppStore();
const authStore = useAuthStore();
const { authFetch } = useAuthFetch();
const route = useRoute();
const router = useRouter();
const { status: viewerStatus, load: loadViewerStatus, login: viewerLogin } = useViewerAccess();
const { detect: detectPush } = usePushNotifications();

// Push notifications link to the changed week.
const linkedYear = Number(route.query.year);
const linkedWeek = Number(route.query.week);
if (Number.isInteger(linkedYear) && Number.isInteger(linkedWeek) && linkedWeek >= 1 && linkedWeek <= 53) {
  appStore.setWeek(linkedYear, linkedWeek);
}

await useAsyncData("viewer-status", () => loadViewerStatus());
const needsAccessCode = computed(() => viewerStatus.value?.hasAccess === false);
const accessError = ref("");

const {
  data: shiftplan,
  pending,
  refresh,
} = await useFetch<WeeklyShiftplanWithPattern>("/api/shiftplan", {
  query: {
    year: computed(() => appStore.selectedYear),
    week: computed(() => appStore.selectedWeek),
  },
  watch: [() => appStore.selectedYear, () => appStore.selectedWeek],
  immediate: !needsAccessCode.value,
});
const { data: absences, refresh: refreshAbsences } = await useFetch<Absence[]>("/api/absences", {
  query: {
    year: computed(() => appStore.selectedYear),
    week: computed(() => appStore.selectedWeek),
  },
  watch: [() => appStore.selectedYear, () => appStore.selectedWeek],
  immediate: !needsAccessCode.value,
  default: () => [],
});
const showNotifyDialog = ref(false);
// Personal app invites are links for the Shiftplan app, not for the browser.
const openedInvite = ref(typeof route.query.einladung === "string");

async function refreshWeek() {
  await Promise.all([refresh(), refreshAbsences()]);
}

async function onAccessGranted() {
  accessError.value = "";
  await refreshWeek();
  void detectPush();
}

// QR codes carry the access code as ?zugang=…; it is removed from the address bar right away.
async function redeemLinkedCode() {
  const code = route.query.zugang;
  if (typeof code !== "string" || !code) return;

  const { zugang: _removed, ...query } = route.query;
  await router.replace({ query });

  if (!needsAccessCode.value) return;
  try {
    await viewerLogin(code);
    await onAccessGranted();
  } catch {
    accessError.value = "Der Zugangscode aus dem Link ist nicht mehr gültig.";
  }
}

const swipeContainer = ref<HTMLElement | null>(null);
const weekPreviewSentinel = ref<HTMLElement | null>(null);
const generating = ref(false);
const showBulkDialog = ref(false);
const showWeekPreview = ref(false);
let weekPreviewObserver: IntersectionObserver | null = null;

const { isSwiping, swipeDirection, swipeOffset } = useSwipe(swipeContainer, {
  onSwipeLeft: () => appStore.nextWeek(),
  onSwipeRight: () => appStore.previousWeek(),
});

const contentSlideClass = computed(() => {
  if (swipeDirection.value === "left") return "content-slide-left";
  if (swipeDirection.value === "right") return "content-slide-right";
  return "";
});

const shiftList = computed<ShiftWithStaff[]>(() => shiftplan.value?.shifts ?? []);
const fullyStaffedShifts = computed(() =>
  shiftList.value.filter((shift) => shift.assigned_staff.length >= shift.min_staff).length
);
const coverageNote = computed(() =>
  shiftList.value.length === 0
    ? "Noch keine Planbasis"
    : `${fullyStaffedShifts.value}/${shiftList.value.length} Schichten im Soll`
);

async function generateFromPattern() {
  generating.value = true;
  try {
    await authFetch("/api/shiftplan/generate", {
      method: "POST",
      body: {
        year: appStore.selectedYear,
        week: appStore.selectedWeek,
      },
    });
    await refresh();
  } finally {
    generating.value = false;
  }
}

function jumpWeeks(offset: number) {
  for (let index = 0; index < offset; index += 1) {
    appStore.nextWeek();
  }
}

onMounted(() => {
  if (openedInvite.value) {
    const { einladung: _invite, ...query } = route.query;
    void router.replace({ query });
  }
  void redeemLinkedCode();

  if (!weekPreviewSentinel.value || !("IntersectionObserver" in window)) {
    showWeekPreview.value = true;
    return;
  }

  weekPreviewObserver = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        showWeekPreview.value = true;
        weekPreviewObserver?.disconnect();
        weekPreviewObserver = null;
      }
    },
    { rootMargin: "240px 0px" }
  );

  weekPreviewObserver.observe(weekPreviewSentinel.value);
});

onBeforeUnmount(() => {
  weekPreviewObserver?.disconnect();
});
</script>

<template>
  <TeamAccessGate
    v-if="needsAccessCode"
    :key="accessError"
    :initial-error="accessError"
    @granted="onAccessGranted"
  />

  <div v-else ref="swipeContainer" class="planner-shell">
    <PlannerWeekHero
      :selected-week="appStore.selectedWeek"
      :selected-year="appStore.selectedYear"
      :formatted-week-range="appStore.formattedWeekRange"
      :pattern-week="shiftplan?.pattern_week"
      :can-edit-shifts="authStore.canEditShifts"
      :generating="generating"
      @previous="appStore.previousWeek"
      @today="appStore.goToCurrentWeek"
      @next="appStore.nextWeek"
      @jump="jumpWeeks"
      @generate="generateFromPattern"
      @open-bulk="showBulkDialog = true"
      @notify-team="showNotifyDialog = true"
    />

    <div
      v-if="openedInvite"
      class="planner-slab flex items-start gap-3 !py-3"
      role="status"
    >
      <i class="pi pi-info-circle mt-0.5 text-[var(--accent-strong)]" aria-hidden="true"></i>
      <p class="min-w-0 flex-1 text-sm text-[var(--text-2)]">
        <span class="font-semibold text-[var(--text-1)]">Das ist ein persönlicher Zugang für die Shiftplan-App.</span>
        Öffne die App und scanne den QR-Code dort. Im Browser hat der Link keine Funktion.
      </p>
      <PrimeButton
        text
        rounded
        icon="pi pi-times"
        severity="secondary"
        class="!h-8 !w-8"
        aria-label="Hinweis schließen"
        @click="openedInvite = false"
      />
    </div>

    <PushPromptCard v-if="!authStore.canEditShifts" />

    <section class="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-6">
      <div
        class="swipe-content min-w-0 space-y-4"
        :class="contentSlideClass"
        :style="isSwiping ? { transform: `translateX(${swipeOffset}px)`, opacity: 1 - Math.abs(swipeOffset) / 200 } : {}"
      >
        <div class="lg:hidden">
          <HolidayInfo
            :year="appStore.selectedYear"
            :week="appStore.selectedWeek"
            banner
          />
        </div>

        <PlannerCurrentWeekSection
          :pending="pending"
          :has-shiftplan="!!shiftplan"
          :shift-list="shiftList"
          :coverage-note="coverageNote"
          :can-edit-shifts="authStore.canEditShifts"
          :is-admin="authStore.isAdmin"
          :year="appStore.selectedYear"
          :week="appStore.selectedWeek"
          :absences="absences ?? []"
          @updated="refreshWeek"
          @generate="generateFromPattern"
        />
      </div>

      <aside class="planner-panel hidden lg:block">
        <div class="mb-3 flex items-center justify-between gap-3">
          <h3 class="text-sm font-semibold text-[var(--text-1)]">Kalender</h3>
          <span class="inline-flex items-center gap-1.5 text-xs text-[var(--text-3)]">
            <span
              class="h-1.5 w-1.5 rounded-full"
              :class="pending ? 'bg-amber-500' : 'bg-emerald-500'"
              aria-hidden="true"
            ></span>
            {{ pending ? "Aktualisiert" : "Aktuell" }}
          </span>
        </div>
        <HolidayInfo
          :year="appStore.selectedYear"
          :week="appStore.selectedWeek"
        />
      </aside>
    </section>

    <div ref="weekPreviewSentinel">
      <LazyWeekPreview v-if="showWeekPreview" />
    </div>

    <LazyPlannerBulkGenerateDialog
      v-if="showBulkDialog"
      :visible="showBulkDialog"
      :year="appStore.selectedYear"
      :week="appStore.selectedWeek"
      @update:visible="showBulkDialog = $event"
      @generated="refresh"
    />

    <LazyTeamNotifyDialog
      v-if="showNotifyDialog"
      :visible="showNotifyDialog"
      @update:visible="showNotifyDialog = $event"
    />
  </div>
</template>
