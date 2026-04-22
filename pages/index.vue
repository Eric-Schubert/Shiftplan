<script setup lang="ts">
import type { ShiftWithStaff, WeeklyShiftplanWithPattern } from "~/types/shiftplan";
import { useSwipe } from "~/composables/useSwipe";

const appStore = useAppStore();
const authStore = useAuthStore();
const { authFetch } = useAuthFetch();

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
});

const swipeContainer = ref<HTMLElement | null>(null);
const generating = ref(false);
const showBulkDialog = ref(false);

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
</script>

<template>
  <div ref="swipeContainer" class="planner-shell">
    <section class="grid gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(20rem,0.95fr)]">
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
      />

      <aside class="planner-panel hidden min-h-[15rem] lg:block">
        <div class="mb-4 flex items-start justify-between gap-3">
          <div>
            <p class="planner-kicker">Kalenderlage</p>
            <h3 class="mt-2 text-lg font-semibold text-[var(--text-1)]">Hinweise für diese Woche</h3>
          </div>
          <span class="planner-chip planner-chip--muted">
            {{ pending ? "Wird aktualisiert" : "Live" }}
          </span>
        </div>
        <HolidayInfo
          :year="appStore.selectedYear"
          :week="appStore.selectedWeek"
        />
      </aside>
    </section>

    <div
      class="swipe-content space-y-4 sm:space-y-5"
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
        @updated="refresh"
        @generate="generateFromPattern"
      />

      <div class="mt-1 sm:mt-0">
        <WeekPreview />
      </div>
    </div>

    <PlannerBulkGenerateDialog
      :visible="showBulkDialog"
      :year="appStore.selectedYear"
      :week="appStore.selectedWeek"
      @update:visible="showBulkDialog = $event"
      @generated="refresh"
    />
  </div>
</template>
