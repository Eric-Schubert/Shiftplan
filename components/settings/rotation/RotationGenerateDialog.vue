<script setup lang="ts">
import type { RotationGeneratePreviewItem, RotationGenerateResult } from "~/types/rotation";

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: "update:visible", value: boolean): void;
}>();

const dataStore = useDataStore();
const { authFetch } = useAuthFetch();

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit("update:visible", value),
});

const previewYear = ref(new Date().getFullYear());
const previewWeek = ref(Math.min(Math.max(getCurrentWeek(), 1), 52));
const previewWeeks = ref(4);
const generating = ref(false);
const generateResult = ref<RotationGenerateResult | null>(null);

watch(
  () => props.visible,
  (isVisible) => {
    if (isVisible) return;
    generateResult.value = null;
  }
);

const generatePreviewList = computed<RotationGeneratePreviewItem[]>(() => {
  if (!dataStore.rotationConfig) return [];

  const config = dataStore.rotationConfig;
  const preview: RotationGeneratePreviewItem[] = [];

  let year = previewYear.value;
  let week = previewWeek.value;

  for (let index = 0; index < previewWeeks.value; index++) {
    const startTotal = config.start_year * 52 + config.start_week;
    const currentTotal = year * 52 + week;
    const weeksFromStart = currentTotal - startTotal;
    const patternIndex = ((weeksFromStart % config.cycle_length) + config.cycle_length) % config.cycle_length;
    const patternWeek = patternIndex + 1;

    preview.push({ year, week, patternWeek });

    week++;
    if (week > 52) {
      week = 1;
      year++;
    }
  }

  return preview;
});

function getCurrentWeek(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const oneWeek = 604800000;
  return Math.ceil((diff / oneWeek) + start.getDay() / 7);
}

async function generatePreview() {
  generating.value = true;
  try {
    generateResult.value = await authFetch<RotationGenerateResult>("/api/shiftplan/generate", {
      method: "POST",
      body: {
        year: previewYear.value,
        week: previewWeek.value,
        weeks: previewWeeks.value,
      },
    });
  } finally {
    generating.value = false;
  }
}

function closeDialog() {
  generateResult.value = null;
  dialogVisible.value = false;
}
</script>

<template>
  <PrimeDialog
    v-model:visible="dialogVisible"
    header="Schichtplan aus Muster generieren"
    modal
    :style="{ width: '30rem', maxWidth: 'calc(100vw - 1.5rem)' }"
  >
    <div class="space-y-4">
      <p class="text-gray-600 dark:text-gray-400">
        Generiert Schichtpläne basierend auf dem definierten Rotationsmuster.
      </p>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div class="flex flex-col gap-2">
          <label for="preview-start-year" class="font-medium">Startjahr</label>
          <PrimeInputNumber
            v-model="previewYear"
            input-id="preview-start-year"
            :min="2020"
            :max="2030"
            :use-grouping="false"
          />
        </div>

        <div class="flex flex-col gap-2">
          <label for="preview-start-week" class="font-medium">Startwoche</label>
          <PrimeInputNumber
            v-model="previewWeek"
            input-id="preview-start-week"
            :min="1"
            :max="53"
            show-buttons
          />
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <label for="preview-weeks-count" class="font-medium">Anzahl Wochen</label>
        <PrimeInputNumber
          v-model="previewWeeks"
          input-id="preview-weeks-count"
          :min="1"
          :max="52"
          show-buttons
        />
      </div>

      <div v-if="!generateResult" class="overflow-hidden rounded-lg border dark:border-gray-700">
        <div class="bg-gray-100 px-4 py-2 text-sm font-medium dark:bg-gray-700">
          Vorschau: Diese Wochen werden generiert
        </div>
        <div class="max-h-48 space-y-1 overflow-y-auto p-4 text-sm">
          <div
            v-for="preview in generatePreviewList"
            :key="`${preview.year}-${preview.week}`"
            class="flex justify-between py-1"
          >
            <span>KW {{ preview.week }}/{{ preview.year }}</span>
            <span class="text-gray-600 dark:text-gray-400">→ Musterwoche {{ preview.patternWeek }}</span>
          </div>
        </div>
      </div>

      <div v-if="generateResult" class="mt-4 rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
        <p class="mb-2 font-medium text-green-700 dark:text-green-400">
          ✓ {{ generateResult.generated }} Wochen generiert
        </p>
        <div class="space-y-1 text-sm text-green-600 dark:text-green-300">
          <div v-for="week in generateResult.weeks" :key="`${week.year}-${week.week}`">
            KW {{ week.week }}/{{ week.year }} → Musterwoche {{ week.pattern_week }}
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <PrimeButton label="Schließen" text @click="closeDialog" />
      <PrimeButton
        label="Generieren"
        icon="pi pi-sparkles"
        class="min-h-11"
        :loading="generating"
        @click="generatePreview"
      />
    </template>
  </PrimeDialog>
</template>
