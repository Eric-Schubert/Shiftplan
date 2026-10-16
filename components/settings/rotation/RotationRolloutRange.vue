<script setup lang="ts">
import { weekOfYearLabel } from "~/shared/utils/format/week";
import { isoWeekOfDate } from "~/shared/utils/week";

defineProps<{
  maxWeekInStartYear: number;
}>();

const startWeek = defineModel<number>("startWeek", { required: true });
const startYear = defineModel<number>("startYear", { required: true });
const untilYearEnd = defineModel<boolean>("untilYearEnd", { required: true });
const weekCount = defineModel<number>("weekCount", { required: true });

const localeTag = useLocaleTag();
const { t } = useI18n();
const today = isoWeekOfDate(new Date());
const startsInPast = computed(() => startYear.value < today.year || (startYear.value === today.year && startWeek.value < today.week));
</script>

<template>
  <div class="grid grid-cols-2 gap-3">
    <div class="flex flex-col gap-2">
      <label for="rollout-week" class="text-sm font-medium text-[var(--text-1)]">{{ t("settings.rollout.range.fromWeek") }}</label>
      <PrimeInputNumber v-model="startWeek" input-id="rollout-week" fluid :min="1" :max="maxWeekInStartYear" show-buttons />
    </div>
    <div class="flex flex-col gap-2">
      <label for="rollout-year" class="text-sm font-medium text-[var(--text-1)]">{{ t("validation.fields.year") }}</label>
      <PrimeInputNumber v-model="startYear" input-id="rollout-year" fluid :min="2020" :max="2100" :use-grouping="false" show-buttons />
    </div>
  </div>

  <p v-if="startsInPast" class="text-sm text-[var(--warning-ink)]">
    <i class="pi pi-exclamation-triangle mr-1" aria-hidden="true"></i>
    {{ t("settings.rollout.range.pastStart", { week: weekOfYearLabel(localeTag, today.year, today.week) }) }}
  </p>

  <fieldset class="space-y-2">
    <legend class="mb-2 text-sm font-medium text-[var(--text-1)]">{{ t("settings.rollout.range.until") }}</legend>
    <label class="flex cursor-pointer items-center gap-3 text-sm text-[var(--text-2)]">
      <PrimeRadioButton v-model="untilYearEnd" :value="true" input-id="rollout-year-end" />
      <span>
        {{ t("settings.rollout.range.yearEnd") }}
        <span class="text-[var(--text-3)]">({{ weekOfYearLabel(localeTag, startYear, maxWeekInStartYear) }})</span>
      </span>
    </label>
    <label class="flex cursor-pointer flex-wrap items-center gap-3 text-sm text-[var(--text-2)]">
      <PrimeRadioButton v-model="untilYearEnd" :value="false" input-id="rollout-count" />
      <span>{{ t("settings.rollout.range.count") }}</span>
      <PrimeInputNumber
        v-if="!untilYearEnd"
        v-model="weekCount"
        :aria-label="t('validation.fields.weekCount')"
        :min="1"
        :max="53"
        show-buttons
        :suffix="t('settings.rotation.config.weeksSuffix')"
        class="w-40"
      />
    </label>
  </fieldset>
</template>
