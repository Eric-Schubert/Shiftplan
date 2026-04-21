<script setup lang="ts">
import type { RotationYearCopyPreview, RotationYearCopyResult } from "~/types/rotation";

defineProps<{
  loading: boolean;
  preview: RotationYearCopyPreview | null;
  result: RotationYearCopyResult | null;
  error: string | null;
  sourceYear: number;
  targetYear: number;
  overwrite: boolean;
}>();
</script>

<template>
  <div class="space-y-4">
    <div v-if="loading" class="flex items-center gap-2 text-sm text-gray-500">
      <i class="pi pi-spin pi-spinner"></i>
      Lade Vorschau...
    </div>

    <div
      v-else-if="preview && preview.totalWeeks > 0"
      class="rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800"
    >
      <div class="text-sm text-gray-700 dark:text-gray-300">
        <p class="mb-1 font-medium">
          {{ preview.totalWeeks }} Wochen mit {{ preview.totalAssignments }} Zuweisungen in {{ sourceYear }}
        </p>
        <p class="text-xs text-gray-500 dark:text-gray-400">
          KW {{ preview.weeks[0]?.week }} bis KW {{ preview.weeks[preview.weeks.length - 1]?.week }}
        </p>
      </div>
    </div>

    <div
      v-else-if="preview && preview.totalWeeks === 0"
      class="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20"
    >
      <p class="text-sm text-yellow-700 dark:text-yellow-300">
        Keine Schichtpläne in {{ sourceYear }} vorhanden.
      </p>
    </div>

    <div
      class="-mt-2 ml-7 text-xs"
      :class="overwrite ? 'text-orange-600 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400'"
    >
      <template v-if="overwrite">
        ⚠ Bestehende Zuweisungen in {{ targetYear }} werden gelöscht und ersetzt.
      </template>
      <template v-else>
        Wochen, die in {{ targetYear }} bereits Zuweisungen haben, werden übersprungen.
      </template>
    </div>

    <div
      v-if="error"
      class="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20"
    >
      <p class="text-sm text-red-700 dark:text-red-300">{{ error }}</p>
    </div>

    <div
      v-if="result?.success"
      class="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20"
    >
      <p class="mb-1 text-sm font-medium text-green-700 dark:text-green-400">
        ✓ Erfolgreich kopiert!
      </p>
      <div class="space-y-0.5 text-xs text-green-600 dark:text-green-300">
        <p>{{ result.copiedWeeks }} Wochen kopiert ({{ result.copiedAssignments }} Zuweisungen)</p>
        <p v-if="result.skippedWeeks > 0">
          {{ result.skippedWeeks }} Wochen übersprungen (bereits befüllt)
        </p>
      </div>
    </div>
  </div>
</template>
