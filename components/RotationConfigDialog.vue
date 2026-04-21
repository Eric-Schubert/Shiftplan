<script setup lang="ts">
import type { RotationConfig, RotationConfigPreviewItem } from "~/types/rotation";

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: "update:visible", value: boolean): void;
}>();

const dataStore = useDataStore();
const savingConfig = ref(false);
const configForm = ref<Partial<RotationConfig>>({});

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit("update:visible", value),
});

watch(
  () => props.visible,
  (isVisible) => {
    if (!isVisible || !dataStore.rotationConfig) return;

    configForm.value = {
      cycle_length: dataStore.rotationConfig.cycle_length,
      start_year: dataStore.rotationConfig.start_year,
      start_week: dataStore.rotationConfig.start_week,
    };
  },
  { immediate: true }
);

const configPreview = computed<RotationConfigPreviewItem[]>(() => {
  const cycleLength = configForm.value.cycle_length || 4;
  const startYear = configForm.value.start_year || 2026;
  const startWeek = configForm.value.start_week || 1;

  const preview: RotationConfigPreviewItem[] = [];
  let year = startYear;
  let week = startWeek - 2;

  while (week < 1) {
    week += 52;
    year--;
  }

  for (let index = 0; index < 8; index++) {
    const startTotal = startYear * 52 + startWeek;
    const currentTotal = year * 52 + week;
    const weeksFromStart = currentTotal - startTotal;
    const patternIndex = ((weeksFromStart % cycleLength) + cycleLength) % cycleLength;
    const patternWeek = patternIndex + 1;
    const isStart = year === startYear && week === startWeek;

    preview.push({ year, week, patternWeek, isStart });

    week++;
    if (week > 52) {
      week = 1;
      year++;
    }
  }

  return preview;
});

async function saveConfig() {
  savingConfig.value = true;
  try {
    await dataStore.updateRotationConfig(configForm.value);
    dialogVisible.value = false;
  } finally {
    savingConfig.value = false;
  }
}
</script>

<template>
  <PrimeDialog
    v-model:visible="dialogVisible"
    header="Rotationsmuster einrichten"
    modal
    :style="{ width: '35rem', maxWidth: 'calc(100vw - 1.5rem)' }"
  >
    <div class="space-y-6">
      <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div class="flex items-start gap-3">
          <Icon name="mdi:information" class="mt-0.5 text-xl text-primary-light dark:text-primary-dark" />
          <div class="text-sm text-gray-700 dark:text-gray-300">
            <p class="mb-1 font-medium">So funktioniert die Rotation:</p>
            <p>Das Schichtmuster wiederholt sich regelmäßig. Lege die Zykluslänge und den Startpunkt fest.</p>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div class="flex flex-col gap-2">
          <label for="rotation-cycle-length" class="font-medium">Zykluslänge</label>
          <PrimeInputNumber
            v-model="configForm.cycle_length"
            input-id="rotation-cycle-length"
            :min="1"
            :max="52"
            show-buttons
            suffix=" Wochen"
          />
        </div>

        <div class="flex flex-col gap-2">
          <label for="rotation-start-year" class="font-medium">Startjahr</label>
          <PrimeInputNumber
            v-model="configForm.start_year"
            input-id="rotation-start-year"
            :min="2020"
            :max="2030"
            :use-grouping="false"
          />
        </div>

        <div class="flex flex-col gap-2">
          <label for="rotation-start-week" class="font-medium">Startwoche</label>
          <PrimeInputNumber
            v-model="configForm.start_week"
            input-id="rotation-start-week"
            :min="1"
            :max="53"
            show-buttons
          />
        </div>
      </div>

      <div class="overflow-hidden rounded-lg border dark:border-gray-700">
        <div class="bg-gray-100 px-4 py-2 text-sm font-medium dark:bg-gray-700">
          Vorschau Wochenzuordnung
        </div>
        <div class="space-y-1 p-4 text-sm">
          <div
            v-for="preview in configPreview"
            :key="`${preview.year}-${preview.week}`"
            class="flex justify-between rounded px-2 py-1"
            :class="preview.isStart ? 'bg-green-100 font-medium dark:bg-green-900/30' : ''"
          >
            <span>KW {{ preview.week }}/{{ preview.year }}</span>
            <span class="text-gray-600 dark:text-gray-400">
              → Musterwoche {{ preview.patternWeek }}
              <span v-if="preview.isStart" class="ml-1 text-green-600 dark:text-green-400">(Start)</span>
            </span>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <PrimeButton label="Abbrechen" text @click="dialogVisible = false" />
      <PrimeButton
        label="Speichern"
        :loading="savingConfig"
        @click="saveConfig"
      />
    </template>
  </PrimeDialog>
</template>
