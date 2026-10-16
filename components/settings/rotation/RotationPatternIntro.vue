<script setup lang="ts">
import { weekOfYearLabel } from "~/shared/utils/format/week";

defineProps<{
  cycleLength: number;
  startWeek: number;
  startYear: number;
}>();
const localeTag = useLocaleTag();
const { t } = useI18n();
</script>

<template>
  <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
    <div class="flex items-start gap-3">
      <i class="pi pi-info-circle mt-0.5 text-xl text-primary-light dark:text-primary-dark" aria-hidden="true"></i>
      <div class="text-sm text-gray-700 dark:text-gray-300">
        <p class="mb-1 font-medium">{{ t("settings.rotation.intro.title") }}</p>
        <i18n-t keypath="settings.rotation.intro.text" tag="p" class="mb-2">
          <template #weeks
            ><strong>{{ t("settings.rotation.intro.weeks", { count: cycleLength }) }}</strong></template
          >
        </i18n-t>
        <p class="text-xs text-gray-500 dark:text-gray-400">
          <i class="pi pi-calendar mr-1" aria-hidden="true"></i>
          {{ t("settings.rotation.intro.firstWeek", { week: weekOfYearLabel(localeTag, startYear, startWeek) }) }}
        </p>
      </div>
    </div>
  </div>
</template>
