<script setup lang="ts">
import type { ShiftplanGenerateResult } from "~/types/shiftplan";
import { getIsoWeeksInYear } from "~/utils/rotation";

const props = defineProps<{
  visible: boolean;
  year: number;
  week: number;
}>();

const emit = defineEmits<{
  (e: "update:visible", value: boolean): void;
  (e: "generated"): void;
}>();

const { authFetch } = useAuthFetch();

const bulkWeeks = ref(4);
const rolloutFullYear = ref(false);
const bulkGenerating = ref(false);
const bulkResult = ref<ShiftplanGenerateResult | null>(null);

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit("update:visible", value),
});

watch(
  () => props.visible,
  (isVisible) => {
    if (!isVisible) {
      bulkResult.value = null;
      bulkWeeks.value = 4;
      rolloutFullYear.value = false;
    }
  }
);

const weeksToGenerate = computed(() => {
  if (!rolloutFullYear.value) return bulkWeeks.value;

  const maxWeeks = getIsoWeeksInYear(props.year);
  return Math.max(1, maxWeeks - props.week + 1);
});

async function generateBulk() {
  bulkGenerating.value = true;
  try {
    bulkResult.value = await authFetch<ShiftplanGenerateResult>("/api/shiftplan/generate", {
      method: "POST",
      body: {
        year: props.year,
        week: props.week,
        weeks: weeksToGenerate.value,
      },
    });
      emit("generated");
  } finally {
    bulkGenerating.value = false;
  }
}
</script>

<template>
  <PrimeDialog
    v-model:visible="dialogVisible"
    modal
    header="Mehrere Wochen generieren"
    :style="{ width: '30rem', maxWidth: 'calc(100vw - 1.5rem)' }"
  >
    <div class="space-y-4">
      <p class="text-sm leading-6 text-[var(--text-2)]">
        Generiert ab KW {{ week }}/{{ year }} mehrere Wochen direkt aus dem Rotationsmuster.
      </p>

      <div class="space-y-1.5">
        <label for="bulk-weeks" class="block text-sm font-medium text-[var(--text-2)]">
          Anzahl Wochen
        </label>
        <PrimeInputNumber
          v-if="!rolloutFullYear"
          v-model="bulkWeeks"
          input-id="bulk-weeks"
          :min="1"
          :max="53"
          class="w-full"
        />
        <div
          v-else
          class="rounded-[14px] border border-[var(--border-soft)] bg-[var(--surface-muted)] px-3 py-2 text-sm font-medium text-[var(--text-1)]"
        >
          {{ weeksToGenerate }} Wochen automatisch
        </div>
      </div>

      <label
        for="bulk-full-year"
        class="flex cursor-pointer items-start gap-3 rounded-[20px] border border-[var(--border-soft)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--text-2)]"
      >
        <PrimeCheckbox
          v-model="rolloutFullYear"
          input-id="bulk-full-year"
          binary
          class="mt-0.5"
        />
        <span>
          <span class="block font-semibold text-[var(--text-1)]">Bis Jahresende ausrollen</span>
          <span class="block leading-5">
            Generiert KW {{ week }}/{{ year }} bis KW {{ getIsoWeeksInYear(year) }}/{{ year }}
            ({{ weeksToGenerate }} Wochen) aus dem aktuellen Muster.
          </span>
        </span>
      </label>

      <div
        v-if="bulkResult"
        class="rounded-[20px] border border-[var(--border-soft)] bg-[var(--positive-soft)] px-4 py-3 text-sm text-[var(--positive-ink)]"
      >
        {{ bulkResult.generated }} Wochen erfolgreich generiert.
      </div>
    </div>

    <template #footer>
      <PrimeButton label="Abbrechen" severity="secondary" text @click="dialogVisible = false" />
      <PrimeButton
        label="Generieren"
        icon="pi pi-sync"
        class="min-h-11"
        :loading="bulkGenerating"
        @click="generateBulk"
      />
    </template>
  </PrimeDialog>
</template>
