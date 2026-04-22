<script setup lang="ts">
import type { ShiftplanGenerateResult } from "~/types/shiftplan";

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
    }
  }
);

async function generateBulk() {
  bulkGenerating.value = true;
  try {
    bulkResult.value = await authFetch<ShiftplanGenerateResult>("/api/shiftplan/generate", {
      method: "POST",
      body: {
        year: props.year,
        week: props.week,
        weeks: bulkWeeks.value,
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
