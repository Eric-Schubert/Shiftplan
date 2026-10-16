<script setup lang="ts">
import { weekLabel } from "~/shared/utils/format/week";
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
const localeTag = useLocaleTag();
const { t } = useI18n();
</script>

<template>
  <div class="space-y-4">
    <div v-if="loading" class="flex items-center gap-2 text-sm text-gray-500">
      <i class="pi pi-spin pi-spinner"></i>
      {{ t("settings.yearCopy.loading") }}
    </div>

    <div
      v-else-if="preview && preview.totalWeeks > 0"
      class="rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800"
    >
      <div class="text-sm text-gray-700 dark:text-gray-300">
        <p class="mb-1 font-medium">
          {{
            t("settings.yearCopy.summary", {
              weeks: preview.totalWeeks,
              assignments: preview.totalAssignments,
              year: sourceYear,
            })
          }}
        </p>
        <p class="text-xs text-gray-500 dark:text-gray-400">
          {{
            t("settings.rotation.weekRange", {
              from: weekLabel(localeTag, preview.weeks[0]?.week ?? 0),
              to: weekLabel(localeTag, preview.weeks.at(-1)?.week ?? 0),
            })
          }}
        </p>
      </div>
    </div>

    <div
      v-else-if="preview && preview.totalWeeks === 0"
      class="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20"
    >
      <p class="text-sm text-yellow-700 dark:text-yellow-300">
        {{ t("settings.yearCopy.empty", { year: sourceYear }) }}
      </p>
    </div>

    <div
      class="-mt-2 ml-7 text-xs"
      :class="overwrite ? 'text-orange-600 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400'"
    >
      {{ t(overwrite ? "settings.yearCopy.overwriteWarning" : "settings.yearCopy.skipNote", { year: targetYear }) }}
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
        {{ t("settings.yearCopy.done") }}
      </p>
      <div class="space-y-0.5 text-xs text-green-600 dark:text-green-300">
        <p>{{ t("settings.yearCopy.copied", { weeks: result.copiedWeeks, assignments: result.copiedAssignments }) }}</p>
        <p v-if="result.skippedWeeks > 0">
          {{ t("settings.yearCopy.skipped", { weeks: result.skippedWeeks }) }}
        </p>
      </div>
    </div>
  </div>
</template>
