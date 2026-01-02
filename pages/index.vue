<script setup lang="ts">
import type { WeeklyShiftplan } from "~/types/shiftplan";

const appStore = useAppStore();

// Lade Schichtplan
const {
  data: shiftplan,
  pending,
  refresh,
} = await useFetch<WeeklyShiftplan>("/api/shiftplan", {
  query: {
    year: computed(() => appStore.selectedYear),
    week: computed(() => appStore.selectedWeek),
  },
  watch: [() => appStore.selectedYear, () => appStore.selectedWeek],
});

// Auto-Generierung
const generating = ref(false);

async function generatePlan() {
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

// Navigation
function goToWeek(offset: number) {
  if (offset > 0) {
    for (let i = 0; i < offset; i++) appStore.nextWeek();
  } else {
    for (let i = 0; i < Math.abs(offset); i++) appStore.previousWeek();
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

    <!-- Quick Links -->
    <div class="flex flex-wrap gap-2">
      <PrimeButton
        v-for="offset in [1, 2, 3]"
        :key="offset"
        :label="`+${offset} Woche${offset > 1 ? 'n' : ''}`"
        text
        size="small"
        severity="secondary"
        @click="goToWeek(offset)"
      />
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
          Erstelle zuerst Schichten in den Einstellungen.
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

      <!-- Auto-Generierung Button -->
      <div v-if="shiftplan.shifts.length > 0" class="pt-4">
        <PrimeButton
          label="Automatisch befüllen"
          icon="pi pi-sparkles"
          severity="secondary"
          :loading="generating"
          @click="generatePlan"
        />
      </div>
    </div>
  </div>
</template>
