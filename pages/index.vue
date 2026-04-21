<script setup lang="ts">
import type { ShiftWithStaff, WeeklyShiftplan } from "~/types/shiftplan";
import { useSwipe } from "~/composables/useSwipe";

const appStore = useAppStore();
const authStore = useAuthStore();
const { authFetch } = useAuthFetch();

interface WeeklyShiftplanWithPattern extends WeeklyShiftplan {
  pattern_week: number;
}

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

const { isSwiping, swipeDirection, swipeOffset } = useSwipe(swipeContainer, {
  onSwipeLeft: () => appStore.nextWeek(),
  onSwipeRight: () => appStore.previousWeek(),
});

const contentSlideClass = computed(() => {
  if (swipeDirection.value === "left") return "content-slide-left";
  if (swipeDirection.value === "right") return "content-slide-right";
  return "";
});

const generating = ref(false);
const showBulkDialog = ref(false);
const bulkWeeks = ref(4);
const bulkGenerating = ref(false);
const bulkResult = ref<{ generated: number } | null>(null);

const shiftList = computed<ShiftWithStaff[]>(() => shiftplan.value?.shifts ?? []);
const totalAssigned = computed(() =>
  shiftList.value.reduce((sum, shift) => sum + shift.assigned_staff.length, 0)
);
const fullyStaffedShifts = computed(() =>
  shiftList.value.filter((shift) => shift.assigned_staff.length >= shift.min_staff).length
);
const coverageNote = computed(() =>
  shiftList.value.length === 0 ? "Noch keine Planbasis" : `${fullyStaffedShifts.value}/${shiftList.value.length} Schichten im Soll`
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

async function generateBulk() {
  bulkGenerating.value = true;
  try {
    bulkResult.value = await authFetch("/api/shiftplan/generate", {
      method: "POST",
      body: {
        year: appStore.selectedYear,
        week: appStore.selectedWeek,
        weeks: bulkWeeks.value,
      },
    });
    await refresh();
  } finally {
    bulkGenerating.value = false;
  }
}
</script>

<template>
  <div ref="swipeContainer" class="planner-shell">
    <section class="grid gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(20rem,0.95fr)]">
      <div class="planner-hero planner-week-hero h-full space-y-4">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="space-y-3">
            <p class="planner-kicker hidden sm:block">Wochenansicht</p>
            <div class="flex flex-wrap items-end gap-3">
              <h2 class="planner-headline text-[var(--text-1)]">
                KW {{ appStore.selectedWeek }}
              </h2>
              <span class="planner-chip planner-chip--muted">{{ appStore.selectedYear }}</span>
              <span v-if="shiftplan?.pattern_week" class="planner-chip planner-chip--accent">
                Muster {{ shiftplan.pattern_week }}
              </span>
            </div>
            <p class="text-sm text-[var(--text-2)] sm:text-base">
              {{ appStore.formattedWeekRange }}
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <PrimeButton
              icon="pi pi-chevron-left"
              text
              rounded
              class="!h-11 !w-11 border !border-[var(--border-soft)] !bg-[var(--surface)]"
              aria-label="Vorherige Woche anzeigen"
              @click="appStore.previousWeek"
            />
            <PrimeButton
              label="Heute"
              text
              class="min-h-11 !rounded-full border !border-[var(--border-soft)] !bg-[var(--surface)] !px-4"
              @click="appStore.goToCurrentWeek"
            />
            <PrimeButton
              icon="pi pi-chevron-right"
              text
              rounded
              class="!h-11 !w-11 border !border-[var(--border-soft)] !bg-[var(--surface)]"
              aria-label="Nächste Woche anzeigen"
              @click="appStore.nextWeek"
            />
            <div class="hidden items-center gap-2 sm:ml-2 sm:flex">
              <PrimeButton
                v-for="offset in [1, 2, 4]"
                :key="offset"
                :label="`+${offset}`"
                text
                class="min-h-11 !rounded-full border !border-[var(--border-soft)] !bg-[var(--surface)] !px-3"
                :aria-label="`${offset} Wochen vorspringen`"
                @click="() => { for (let i = 0; i < offset; i += 1) appStore.nextWeek(); }"
              />
            </div>
          </div>
        </div>

        <div v-if="authStore.canEditShifts" class="flex flex-wrap gap-2">
          <PrimeButton
            label="Aus Muster füllen"
            icon="pi pi-sync"
            severity="secondary"
            class="min-h-11 !rounded-full !px-5"
            :loading="generating"
            @click="generateFromPattern"
          />
          <PrimeButton
            label="Mehrere Wochen"
            icon="pi pi-calendar-plus"
            severity="secondary"
            class="min-h-11 !rounded-full !px-5"
            aria-label="Mehrere Wochen aus dem Muster generieren"
            @click="showBulkDialog = true"
          />
        </div>
      </div>

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

      <section class="planner-slab planner-current-week">
        <div class="planner-section-heading !hidden sm:!flex">
          <div>
            <p class="planner-kicker hidden sm:block">Einsatzplan</p>
            <h3 class="text-lg font-semibold text-[var(--text-1)] sm:mt-2 sm:text-xl">Schichten dieser Woche</h3>
          </div>
          <span v-if="shiftList.length > 0" class="planner-chip planner-chip--muted !hidden sm:!inline-flex">
            {{ coverageNote }}
          </span>
        </div>

        <div v-if="pending" class="flex justify-center py-10">
          <PrimeProgressSpinner />
        </div>

        <template v-else-if="shiftplan">
          <div v-if="shiftList.length === 0" class="planner-empty">
            <Icon name="mdi:calendar-blank-outline" class="text-4xl text-[var(--text-3)]" />
            <div class="space-y-2">
              <h4 class="text-lg font-semibold text-[var(--text-1)]">Diese Woche hat noch keine Struktur</h4>
              <p class="mx-auto max-w-[36rem] text-sm leading-6">
                Lege zuerst die Schichten an. Danach wirkt der Plan sofort geordneter und das Team kann verteilt werden.
              </p>
            </div>
            <NuxtLink v-if="authStore.isAdmin" to="/settings">
              <PrimeButton label="Zu den Einstellungen" icon="pi pi-arrow-right" class="min-h-11 !rounded-full !px-5" />
            </NuxtLink>
          </div>

          <div v-else class="space-y-2.5 sm:space-y-3">
            <ShiftCard
              v-for="shift in shiftList"
              :key="shift.shift_id"
              :shift="shift"
              :year="appStore.selectedYear"
              :week="appStore.selectedWeek"
              @updated="refresh"
            />
          </div>

          <div
            v-if="shiftList.length > 0 && totalAssigned === 0"
            class="mt-4 rounded-[20px] border border-[var(--border-soft)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--text-2)]"
          >
            <div class="flex flex-wrap items-center gap-2">
              <span class="rounded-full bg-[var(--warning-soft)] px-3 py-1 text-xs font-semibold text-[var(--warning-ink)]">
                Noch unbesetzt
              </span>
              <span>Die Schichten sind angelegt, aber es wurde noch niemand zugewiesen.</span>
              <button
                v-if="authStore.canEditShifts"
                type="button"
                class="font-semibold text-[var(--accent-strong)] underline decoration-transparent underline-offset-4 transition hover:decoration-current"
                @click="generateFromPattern"
              >
                Jetzt aus Muster generieren
              </button>
            </div>
          </div>
        </template>
      </section>

      <div class="mt-1 sm:mt-0">
        <WeekPreview />
      </div>
    </div>

    <PrimeDialog
      v-model:visible="showBulkDialog"
      modal
      header="Mehrere Wochen generieren"
      :style="{ width: '30rem', maxWidth: 'calc(100vw - 1.5rem)' }"
    >
      <div class="space-y-4">
        <p class="text-sm leading-6 text-[var(--text-2)]">
          Generiert ab KW {{ appStore.selectedWeek }}/{{ appStore.selectedYear }} mehrere Wochen direkt aus dem Rotationsmuster.
        </p>

        <div class="space-y-1.5">
          <label for="bulk-weeks" class="block text-sm font-medium text-[var(--text-2)]">
            Anzahl Wochen
          </label>
          <PrimeInputNumber
            v-model="bulkWeeks"
            input-id="bulk-weeks"
            :min="1"
            :max="52"
            class="w-full"
          />
        </div>

        <div
          v-if="bulkResult"
          class="rounded-[20px] border border-[var(--border-soft)] bg-[var(--positive-soft)] px-4 py-3 text-sm text-[var(--positive-ink)]"
        >
          {{ bulkResult.generated }} Wochen erfolgreich generiert.
        </div>
      </div>

      <template #footer>
        <PrimeButton label="Abbrechen" severity="secondary" text @click="showBulkDialog = false" />
        <PrimeButton
          label="Generieren"
          icon="pi pi-sync"
          class="min-h-11"
          :loading="bulkGenerating"
          @click="generateBulk"
        />
      </template>
    </PrimeDialog>
  </div>
</template>
