<script setup lang="ts">
/**
 * HolidayInfo Component
 * 
 * Zeigt Feiertage und Schulferien für eine bestimmte Kalenderwoche an.
 * Nutzt die OpenHolidays API über interne Server-Endpoints.
 * 
 * Features:
 * - Deutsche bundesweite Feiertage
 * - Sächsische Feiertage (Buß- und Bettag, Reformationstag)
 * - Schulferien für Sachsen und Brandenburg
 * - Automatisches Caching
 */

import { ref, watch, computed } from 'vue';
import { useHolidays, type PublicHoliday } from '~/composables/useHolidays';
import { 
  useSchoolHolidays, 
  formatHolidayPeriod,
  type SchoolHolidayPeriod 
} from '~/composables/useSchoolHolidays';

interface Props {
  year: number;
  week: number;
  compact?: boolean; // Kompakte Ansicht für WeekPreview
}

const props = withDefaults(defineProps<Props>(), {
  compact: false
});

// Composables
const { getHolidaysForWeek } = useHolidays();
const { getSchoolHolidaysForWeek } = useSchoolHolidays();

// State
const holidays = ref<PublicHoliday[]>([]);
const schoolHolidays = ref<SchoolHolidayPeriod[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

// Daten laden
async function loadData() {
  loading.value = true;
  error.value = null;
  
  try {
    const [holidayData, schoolData] = await Promise.all([
      getHolidaysForWeek(props.year, props.week),
      getSchoolHolidaysForWeek(props.year, props.week)
    ]);
    
    holidays.value = holidayData;
    schoolHolidays.value = schoolData;
  } catch (e: any) {
    error.value = e.message || 'Fehler beim Laden';
    console.error('HolidayInfo error:', e);
  } finally {
    loading.value = false;
  }
}

// Bei Prop-Änderungen neu laden
watch(
  () => [props.year, props.week],
  () => loadData(),
  { immediate: true }
);

// Prüft ob es etwas anzuzeigen gibt
const hasContent = computed(() => {
  return holidays.value.length > 0 || schoolHolidays.value.length > 0;
});

// Formatiert das Datum eines Feiertags
function formatHolidayDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('de-DE', { 
    weekday: 'short', 
    day: '2-digit', 
    month: '2-digit' 
  });
}

// Kürzt den Feiertagnamen für kompakte Ansicht
function shortenHolidayName(name: string): string {
  const shortNames: Record<string, string> = {
    'Neujahr': 'Neujahr',
    'Tag der Arbeit': '1. Mai',
    'Tag der Deutschen Einheit': 'Einheit',
    '1. Weihnachtstag': '1. Weihn.',
    '2. Weihnachtstag': '2. Weihn.',
    'Erster Weihnachtstag': '1. Weihn.',
    'Zweiter Weihnachtstag': '2. Weihn.',
    'Karfreitag': 'Karfreitag',
    'Ostersonntag': 'Ostern',
    'Ostermontag': 'Ostermo.',
    'Christi Himmelfahrt': 'Himmelfahrt',
    'Pfingstsonntag': 'Pfingsten',
    'Pfingstmontag': 'Pfingstmo.',
    'Buß- und Bettag': 'Buß+Bettag',
    'Reformationstag': 'Reformation'
  };
  return shortNames[name] || name;
}
</script>

<template>
  <!-- Loading State -->
  <div v-if="loading && !hasContent" class="flex items-center gap-2 text-xs text-gray-400">
    <i class="pi pi-spin pi-spinner"></i>
    <span v-if="!compact">Lade Feiertage...</span>
  </div>
  
  <!-- Error State -->
  <div v-else-if="error && !hasContent" class="text-xs text-red-500">
    <span v-if="!compact">{{ error }}</span>
  </div>
  
  <!-- Content -->
  <div v-else-if="hasContent" :class="compact ? '' : 'space-y-2'">
    <!-- Kompakte Ansicht für WeekPreview -->
    <template v-if="compact">
      <!-- Feiertage kompakt -->
      <div 
        v-for="holiday in holidays" 
        :key="holiday.date"
        class="flex items-center gap-1 text-xs"
      >
        <span 
          class="w-1.5 h-1.5 rounded-full flex-shrink-0"
          :class="holiday.type === 'national' ? 'bg-red-500' : 'bg-orange-400'"
        ></span>
        <span class="text-red-600 dark:text-red-400 truncate">
          {{ shortenHolidayName(holiday.name) }}
        </span>
      </div>
      
      <!-- Schulferien kompakt -->
      <div 
        v-for="period in schoolHolidays" 
        :key="`${period.name}-${period.start}`"
        class="flex items-center gap-1 text-xs"
      >
        <span class="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0"></span>
        <span class="text-blue-600 dark:text-blue-400 truncate">
          {{ period.name }}
          <span class="text-gray-400 text-[10px]">
            ({{ period.states.map(s => s.code).join('/') }})
          </span>
        </span>
      </div>
    </template>
    
    <!-- Ausführliche Ansicht für Hauptseite -->
    <template v-else>
      <!-- Feiertage Box -->
      <div 
        v-if="holidays.length > 0"
        class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3"
      >
        <h4 class="text-sm font-medium text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
          <i class="pi pi-calendar text-xs"></i>
          Feiertage
        </h4>
        <div class="space-y-1">
          <div 
            v-for="holiday in holidays" 
            :key="holiday.date"
            class="flex items-center justify-between text-sm"
          >
            <div class="flex items-center gap-2">
              <span 
                class="w-2 h-2 rounded-full"
                :class="holiday.type === 'national' ? 'bg-red-500' : 'bg-orange-400'"
              ></span>
              <span class="text-gray-900 dark:text-gray-100">
                {{ holiday.name }}
              </span>
              <span 
                v-if="holiday.type === 'saxony'"
                class="text-[10px] px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded"
              >
                SN
              </span>
            </div>
            <span class="text-gray-500 dark:text-gray-400 text-xs">
              {{ formatHolidayDate(holiday.date) }}
            </span>
          </div>
        </div>
      </div>
      
      <!-- Schulferien Box -->
      <div 
        v-if="schoolHolidays.length > 0"
        class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3"
      >
        <h4 class="text-sm font-medium text-blue-700 dark:text-blue-400 mb-2 flex items-center gap-2">
          <i class="pi pi-book text-xs"></i>
          Schulferien
        </h4>
        <div class="space-y-2">
          <div 
            v-for="period in schoolHolidays" 
            :key="`${period.name}-${period.start}`"
            class="text-sm"
          >
            <div class="flex items-center justify-between">
              <span class="text-gray-900 dark:text-gray-100 font-medium">
                {{ period.name }}
              </span>
              <span class="text-gray-500 dark:text-gray-400 text-xs">
                {{ formatHolidayPeriod(period.start, period.end) }}
              </span>
            </div>
            <div class="flex gap-1 mt-1">
              <span 
                v-for="state in period.states" 
                :key="state.code"
                class="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded"
              >
                {{ state.name }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
