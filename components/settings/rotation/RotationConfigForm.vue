<script setup lang="ts">
import type { RotationConfig, RotationConfigPreviewItem } from "~/types/rotation";
import { getIsoWeeksInYear, getPatternWeekForCalendarWeek } from "~/utils/rotation";

const emit = defineEmits<{
  (e: "saved"): void;
  (e: "cancel"): void;
}>();

const dataStore = useDataStore();
const saving = ref(false);
const errorMessage = ref<string | null>(null);
const configForm = ref<Pick<RotationConfig, "cycle_length" | "start_year" | "start_week">>({
  cycle_length: dataStore.rotationConfig?.cycle_length ?? 4,
  start_year: dataStore.rotationConfig?.start_year ?? new Date().getFullYear(),
  start_week: dataStore.rotationConfig?.start_week ?? 1,
});

const configPreview = computed<RotationConfigPreviewItem[]>(() => {
  const { cycle_length: cycleLength, start_year: startYear, start_week: startWeek } = configForm.value;
  if (!cycleLength || !startYear || !startWeek) return [];

  const preview: RotationConfigPreviewItem[] = [];
  let year = startYear;
  let week = startWeek - 2;

  while (week < 1) {
    year--;
    week += getIsoWeeksInYear(year);
  }

  for (let index = 0; index < 6; index++) {
    preview.push({
      year,
      week,
      patternWeek: getPatternWeekForCalendarWeek(cycleLength, startYear, startWeek, year, week),
      isStart: year === startYear && week === startWeek,
    });

    week++;
    if (week > getIsoWeeksInYear(year)) {
      week = 1;
      year++;
    }
  }

  return preview;
});

async function save() {
  saving.value = true;
  errorMessage.value = null;
  try {
    await dataStore.updateRotationConfig(configForm.value);
    emit("saved");
  } catch (error: any) {
    errorMessage.value = error.data?.statusMessage || "Startpunkt konnte nicht gespeichert werden";
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div class="flex flex-col gap-2">
        <label for="rotation-cycle-length" class="text-sm font-medium text-[var(--text-1)]">Zykluslänge</label>
        <PrimeInputNumber
          v-model="configForm.cycle_length"
          input-id="rotation-cycle-length"
          fluid
          :min="1"
          :max="52"
          show-buttons
          suffix=" Wochen"
        />
      </div>
      <div class="flex flex-col gap-2">
        <label for="rotation-start-week" class="text-sm font-medium text-[var(--text-1)]">
          Musterwoche 1 ist KW
        </label>
        <PrimeInputNumber
          v-model="configForm.start_week"
          input-id="rotation-start-week"
          fluid
          :min="1"
          :max="getIsoWeeksInYear(configForm.start_year || new Date().getFullYear())"
          show-buttons
        />
      </div>
      <div class="flex flex-col gap-2">
        <label for="rotation-start-year" class="text-sm font-medium text-[var(--text-1)]">im Jahr</label>
        <PrimeInputNumber
          v-model="configForm.start_year"
          input-id="rotation-start-year"
          fluid
          :min="2020"
          :max="2100"
          :use-grouping="false"
          show-buttons
        />
      </div>
    </div>

    <div class="flex flex-wrap gap-1.5 text-xs">
      <span
        v-for="item in configPreview"
        :key="`${item.year}-${item.week}`"
        class="planner-chip"
        :class="item.isStart ? 'planner-chip--accent' : ''"
      >
        KW {{ item.week }}/{{ item.year }} → Muster {{ item.patternWeek }}
      </span>
    </div>

    <p v-if="errorMessage" class="text-sm text-[var(--danger-ink)]">{{ errorMessage }}</p>

    <div class="flex flex-wrap gap-2">
      <PrimeButton label="Startpunkt speichern" class="min-h-11" :loading="saving" @click="save" />
      <PrimeButton label="Abbrechen" severity="secondary" text class="min-h-11" @click="emit('cancel')" />
    </div>
  </div>
</template>
