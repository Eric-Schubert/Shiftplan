<script setup lang="ts">
import type { WeeklyShiftplan } from "~/types/shiftplan";
import { useSwipe } from "~/composables/useSwipe";

const appStore = useAppStore();
const authStore = useAuthStore();
const dataStore = useDataStore();

// Erweiterter Typ mit pattern_week
interface WeeklyShiftplanWithPattern extends WeeklyShiftplan {
  pattern_week: number;
}

// Lade Schichtplan
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

// ============================================
// SWIPE NAVIGATION
// ============================================
const swipeContainer = ref<HTMLElement | null>(null);

const { isSwiping, swipeDirection, swipeOffset } = useSwipe(swipeContainer, {
  onSwipeLeft: () => appStore.nextWeek(),
  onSwipeRight: () => appStore.previousWeek(),
});

// Nur Content-Bereich animieren, nicht Header/Nav
const contentSlideClass = computed(() => {
  if (swipeDirection.value === "left") return "content-slide-left";
  if (swipeDirection.value === "right") return "content-slide-right";
  return "";
});

// ============================================
// GENERIERUNG
// ============================================
const generating = ref(false);

async function generateFromPattern() {
  generating.value = true;
  try {
    await $fetch("/api/shiftplan/generate", {
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

// Mehrere Wochen generieren
const showBulkDialog = ref(false);
const bulkWeeks = ref(4);
const bulkGenerating = ref(false);
const bulkResult = ref<{ generated: number } | null>(null);

async function generateBulk() {
  bulkGenerating.value = true;
  try {
    bulkResult.value = await $fetch("/api/shiftplan/generate", {
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
  <div
    ref="swipeContainer"
    class="space-y-4"
  >
    <!-- Header mit Navigation - Kompakter -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
      <div>
        <div class="flex items-center gap-3">
          <h2 class="text-xl font-bold text-gray-900 dark:text-white">
            KW {{ appStore.selectedWeek }}
          </h2>
          <span class="text-sm text-gray-500 dark:text-gray-400">
            {{ appStore.formattedWeekRange }} · {{ appStore.selectedYear }}
          </span>
          <span v-if="shiftplan?.pattern_week" class="text-xs px-2 py-0.5 bg-primary-light/10 dark:bg-primary-dark/20 text-primary-light dark:text-primary-dark rounded">
            Muster {{ shiftplan.pattern_week }}
          </span>
        </div>
      </div>

      <div class="flex items-center gap-1">
        <PrimeButton
            icon="pi pi-chevron-left"
            text
            rounded
            size="small"
            @click="appStore.previousWeek"
        />
        <PrimeButton
            label="Heute"
            text
            size="small"
            @click="appStore.goToCurrentWeek"
        />
        <PrimeButton
            icon="pi pi-chevron-right"
            text
            rounded
            size="small"
            @click="appStore.nextWeek"
        />

        <!-- Quick Jump -->
        <div class="hidden sm:flex items-center gap-1 ml-2 border-l dark:border-gray-700 pl-2">
          <PrimeButton
              v-for="offset in [1, 2, 4]"
              :key="offset"
              :label="`+${offset}`"
              text
              size="small"
              severity="secondary"
              class="!px-2"
              @click="() => { for(let i = 0; i < offset; i++) appStore.nextWeek() }"
          />
        </div>
      </div>
    </div>

    <!-- Feiertage & Schulferien Anzeige -->
    <HolidayInfo 
      :year="appStore.selectedYear" 
      :week="appStore.selectedWeek" 
    />

    <!-- Swipe-animierter Content-Bereich -->
    <div
      class="swipe-content space-y-4"
      :class="contentSlideClass"
      :style="isSwiping ? { opacity: 1 - Math.abs(swipeOffset) / 200 } : {}"
    >
      <!-- Admin Actions - Kompakt -->
      <div v-if="authStore.isAuthenticated" class="flex gap-2">
      <PrimeButton
          label="Aus Muster füllen"
          icon="pi pi-sync"
          severity="secondary"
          size="small"
          :loading="generating"
          @click="generateFromPattern"
      />
      <PrimeButton
          icon="pi pi-calendar-plus"
          severity="secondary"
          size="small"
          @click="showBulkDialog = true"
          v-tooltip="'Mehrere Wochen generieren'"
      />
    </div>

    <!-- Loading State -->
    <div v-if="pending" class="flex justify-center py-8">
      <PrimeProgressSpinner />
    </div>

    <!-- Schichtplan -->
    <div v-else-if="shiftplan">
      <!-- Keine Schichten -->
      <div
          v-if="shiftplan.shifts.length === 0"
          class="text-center py-8 bg-white dark:bg-gray-800 rounded-lg shadow"
      >
        <Icon name="mdi:calendar-blank" class="text-4xl text-gray-400 mb-2" />
        <h3 class="font-medium text-gray-900 dark:text-white">
          Keine Schichten definiert
        </h3>
        <NuxtLink to="/settings" class="text-primary-light dark:text-primary-dark text-sm">
          → Einstellungen
        </NuxtLink>
      </div>

      <!-- Schichten Liste - Vertikal aber kompakt -->
      <div v-else class="space-y-2">
        <ShiftCard
            v-for="shift in shiftplan.shifts"
            :key="shift.shift_id"
            :shift="shift"
            :year="appStore.selectedYear"
            :week="appStore.selectedWeek"
            @updated="refresh"
        />
      </div>

      <!-- Hinweis wenn leer - Kompakter -->
      <div
          v-if="shiftplan.shifts.length > 0 && shiftplan.shifts.every(s => s.assigned_staff.length === 0)"
          class="text-center py-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800 text-sm"
      >
        <span class="text-yellow-700 dark:text-yellow-300">
          ⚠ Diese Woche ist noch nicht befüllt.
        </span>
        <span v-if="authStore.isAuthenticated" class="text-yellow-600 dark:text-yellow-400 ml-2">
          → "Aus Muster füllen" klicken
        </span>
      </div>
    </div>
    </div><!-- /swipe-content -->

    <!-- Vorschau der nächsten Wochen -->
    <WeekPreview />

    <!-- Bulk Generate Dialog -->
    <PrimeDialog
        v-model:visible="showBulkDialog"
        header="Mehrere Wochen generieren"
        modal
        :style="{ width: '22rem' }"
    >
      <div class="space-y-3">
        <p class="text-gray-600 dark:text-gray-400 text-sm">
          Generiert ab KW {{ appStore.selectedWeek }}/{{ appStore.selectedYear }}
        </p>

        <div class="flex flex-col gap-2">
          <label class="font-medium text-sm">Anzahl Wochen</label>
          <PrimeInputNumber
              v-model="bulkWeeks"
              :min="1"
              :max="52"
              show-buttons
          />
        </div>

        <div v-if="bulkResult" class="p-2 bg-green-50 dark:bg-green-900/20 rounded text-sm">
          <span class="text-green-700 dark:text-green-400">
            ✓ {{ bulkResult.generated }} Wochen generiert!
          </span>
        </div>
      </div>

      <template #footer>
        <PrimeButton label="Schließen" text size="small" @click="showBulkDialog = false; bulkResult = null" />
        <PrimeButton
            label="Generieren"
            icon="pi pi-sparkles"
            size="small"
            :loading="bulkGenerating"
            @click="generateBulk"
        />
      </template>
    </PrimeDialog>
  </div>
</template>

<style scoped>
.swipe-content {
  transition: opacity 0.2s ease-out;
}

.content-slide-left {
  animation: fadeSlideLeft 0.3s ease-out;
}

.content-slide-right {
  animation: fadeSlideRight 0.3s ease-out;
}

@keyframes fadeSlideLeft {
  0% { opacity: 0.4; transform: translateX(-15px); }
  100% { opacity: 1; transform: translateX(0); }
}

@keyframes fadeSlideRight {
  0% { opacity: 0.4; transform: translateX(15px); }
  100% { opacity: 1; transform: translateX(0); }
}
</style>
