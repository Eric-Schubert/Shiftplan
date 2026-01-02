<script setup lang="ts">
import type { WeeklyShiftplan } from "~/types/shiftplan";

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

// Generierung aus Muster
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
  <div class="space-y-6">
    <!-- Header mit Navigation -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
          Kalenderwoche {{ appStore.selectedWeek }}
        </h2>
        <p class="text-gray-500 dark:text-gray-400">
          {{ appStore.formattedWeekRange }} · {{ appStore.selectedYear }}
          <span v-if="shiftplan?.pattern_week" class="ml-2 text-primary-light dark:text-primary-dark">
            (Musterwoche {{ shiftplan.pattern_week }})
          </span>
        </p>
      </div>

      <div class="flex items-center gap-2">
        <PrimeButton
          icon="pi pi-chevron-left"
          text
          rounded
          @click="appStore.previousWeek"
          v-tooltip="'Vorherige Woche'"
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
          @click="appStore.nextWeek"
          v-tooltip="'Nächste Woche'"
        />
      </div>
    </div>

    <!-- Quick Links & Actions -->
    <div class="flex flex-wrap gap-2 items-center justify-between">
      <div class="flex flex-wrap gap-2">
        <PrimeButton
          v-for="offset in [1, 2, 3, 4]"
          :key="offset"
          :label="`+${offset} W`"
          text
          size="small"
          severity="secondary"
          @click="() => { for(let i = 0; i < offset; i++) appStore.nextWeek() }"
        />
      </div>

      <!-- Admin-only Actions -->
      <div v-if="authStore.isAuthenticated" class="flex gap-2">
        <PrimeButton
          label="Aus Muster füllen"
          icon="pi pi-sync"
          severity="secondary"
          size="small"
          :loading="generating"
          @click="generateFromPattern"
          v-tooltip="'Diese Woche aus dem Rotationsmuster befüllen'"
        />
        <PrimeButton
          icon="pi pi-calendar-plus"
          severity="secondary"
          size="small"
          @click="showBulkDialog = true"
          v-tooltip="'Mehrere Wochen generieren'"
        />
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="pending" class="flex justify-center py-12">
      <PrimeProgressSpinner />
    </div>

    <!-- Schichtplan -->
    <div v-else-if="shiftplan" class="space-y-4">
      <!-- Keine Schichten -->
      <div
        v-if="shiftplan.shifts.length === 0"
        class="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow"
      >
        <Icon name="mdi:calendar-blank" class="text-5xl text-gray-400 mb-4" />
        <h3 class="text-lg font-medium text-gray-900 dark:text-white">
          Keine Schichten definiert
        </h3>
        <p class="text-gray-500 dark:text-gray-400 mb-4">
          Erstelle zuerst Schichten und ein Rotationsmuster in den Einstellungen.
        </p>
        <NuxtLink to="/settings">
          <PrimeButton label="Zu den Einstellungen" icon="pi pi-cog" />
        </NuxtLink>
      </div>

      <!-- Schichten Liste -->
      <div v-else class="space-y-3">
        <ShiftCard
          v-for="shift in shiftplan.shifts"
          :key="shift.shift_id"
          :shift="shift"
          :year="appStore.selectedYear"
          :week="appStore.selectedWeek"
          @updated="refresh"
        />
      </div>

      <!-- Hinweis wenn leer -->
      <div
        v-if="shiftplan.shifts.length > 0 && shiftplan.shifts.every(s => s.assigned_staff.length === 0)"
        class="text-center py-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800"
      >
        <Icon name="mdi:information" class="text-3xl text-yellow-500 mb-2" />
        <p class="text-yellow-700 dark:text-yellow-300">
          Diese Woche ist noch nicht befüllt.
        </p>
        <p v-if="authStore.isAuthenticated" class="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
          Klicke "Aus Muster füllen" oder füge Mitarbeiter manuell hinzu.
        </p>
      </div>
    </div>

    <!-- Bulk Generate Dialog -->
    <PrimeDialog
      v-model:visible="showBulkDialog"
      header="Mehrere Wochen generieren"
      modal
      :style="{ width: '25rem' }"
    >
      <div class="space-y-4">
        <p class="text-gray-600 dark:text-gray-400">
          Generiert Schichtpläne für mehrere aufeinanderfolgende Wochen ab KW {{ appStore.selectedWeek }}/{{ appStore.selectedYear }}.
        </p>

        <div class="flex flex-col gap-2">
          <label class="font-medium">Anzahl Wochen</label>
          <PrimeInputNumber
            v-model="bulkWeeks"
            :min="1"
            :max="52"
            show-buttons
          />
        </div>

        <div v-if="bulkResult" class="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <p class="text-green-700 dark:text-green-400">
            ✓ {{ bulkResult.generated }} Wochen erfolgreich generiert!
          </p>
        </div>
      </div>

      <template #footer>
        <PrimeButton label="Schließen" text @click="showBulkDialog = false; bulkResult = null" />
        <PrimeButton
          label="Generieren"
          icon="pi pi-sparkles"
          :loading="bulkGenerating"
          @click="generateBulk"
        />
      </template>
    </PrimeDialog>
  </div>
</template>
