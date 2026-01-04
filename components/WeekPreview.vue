<script setup lang="ts">
import { useAppStore } from "~/stores/app.store";

const appStore = useAppStore();

// Anzahl der Vorschau-Wochen
const previewWeekCount = 3;

// Die nächsten Wochen aus dem Store
const upcomingWeeks = computed(() => appStore.getUpcomingWeeks(previewWeekCount));

// Lade Schichtpläne für die Vorschau-Wochen (Object statt Map für Reaktivität)
const previewData = ref<Record<string, any>>({});
const loading = ref(true);

async function loadPreviewWeeks() {
  loading.value = true;
  const newData: Record<string, any> = {};
  
  for (const week of upcomingWeeks.value) {
    const key = `${week.year}-${week.week}`;
    try {
      const response = await $fetch("/api/shiftplan", {
        query: {
          year: week.year,
          week: week.week,
        },
      });
      newData[key] = response;
    } catch (e) {
      newData[key] = null;
    }
  }
  
  // Komplettes Object ersetzen für Reaktivität
  previewData.value = newData;
  loading.value = false;
}

// Initiales Laden und bei Wochenwechsel
watch(
  () => [appStore.selectedYear, appStore.selectedWeek],
  () => loadPreviewWeeks(),
  { immediate: true }
);

// Hilfsfunktion: Schichtinformationen für eine Vorschau-Woche
function getWeekShifts(year: number, week: number) {
  const key = `${year}-${week}`;
  const data = previewData.value[key];
  
  // API gibt { week, shifts, pattern_week } zurück
  // shifts enthält assigned_staff Array
  if (!data?.shifts || data.shifts.length === 0) {
    return null;
  }
  
  // Nur Schichten mit zugewiesenen Mitarbeitern
  const shiftsWithStaff = data.shifts
    .filter((shift: any) => shift.assigned_staff && shift.assigned_staff.length > 0)
    .map((shift: any) => ({
      name: shift.name,
      color: shift.color || "#6366f1",
      staff: shift.assigned_staff.map((s: any) => s.name),
    }));
  
  return shiftsWithStaff.length > 0 ? shiftsWithStaff : null;
}

// Zur Woche navigieren
function goToWeek(year: number, week: number) {
  appStore.setWeek(year, week);
  // Scroll nach oben
  window.scrollTo({ top: 0, behavior: "smooth" });
}
</script>

<template>
  <div class="mt-4 pt-4 border-t dark:border-gray-700">
    <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
      <i class="pi pi-calendar-plus text-primary-light dark:text-primary-dark"></i>
      Nächste Wochen
    </h3>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div
        v-for="week in upcomingWeeks"
        :key="`${week.year}-${week.week}`"
        class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
        @click="goToWeek(week.year, week.week)"
      >
        <!-- Header - Kompakt -->
        <div class="bg-gray-50 dark:bg-gray-700 px-3 py-2 border-b border-gray-200 dark:border-gray-600">
          <div class="flex justify-between items-center">
            <span class="font-semibold text-gray-900 dark:text-white text-sm">
              KW {{ week.week }}
            </span>
            <span class="text-xs text-gray-500 dark:text-gray-400">
              {{ week.dateRange }}
            </span>
          </div>
        </div>

        <!-- Content - Kompakt -->
        <div class="p-2 min-h-[60px]">
          <!-- Loading State -->
          <div v-if="loading" class="flex items-center justify-center py-2">
            <i class="pi pi-spin pi-spinner text-gray-400 text-sm"></i>
          </div>

          <!-- Schichten anzeigen -->
          <template v-else>
            <div
              v-if="getWeekShifts(week.year, week.week)"
              class="space-y-1"
            >
              <div
                v-for="shift in getWeekShifts(week.year, week.week)"
                :key="shift.name"
                class="flex items-center gap-1.5"
              >
                <div
                  class="w-2 h-2 rounded-full flex-shrink-0"
                  :style="{ backgroundColor: shift.color }"
                ></div>
                <span class="text-xs text-gray-600 dark:text-gray-400 truncate">
                  {{ shift.name }}: {{ shift.staff.join(", ") }}
                </span>
              </div>
            </div>

            <!-- Keine Daten -->
            <div
              v-else
              class="text-center py-2 text-gray-400 dark:text-gray-500"
            >
              <p class="text-xs">Nicht geplant</p>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
