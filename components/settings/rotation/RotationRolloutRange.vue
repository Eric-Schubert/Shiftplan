<script setup lang="ts">
import { getIsoWeekOfDate } from "~/utils/rotation";

defineProps<{
  maxWeekInStartYear: number;
}>();

const startWeek = defineModel<number>("startWeek", { required: true });
const startYear = defineModel<number>("startYear", { required: true });
const untilYearEnd = defineModel<boolean>("untilYearEnd", { required: true });
const weekCount = defineModel<number>("weekCount", { required: true });

const today = getIsoWeekOfDate(new Date());
const startsInPast = computed(
  () => startYear.value < today.year || (startYear.value === today.year && startWeek.value < today.week)
);
</script>

<template>
  <div class="grid grid-cols-2 gap-3">
    <div class="flex flex-col gap-2">
      <label for="rollout-week" class="text-sm font-medium text-[var(--text-1)]">Ab KW</label>
      <PrimeInputNumber
        v-model="startWeek"
        input-id="rollout-week"
        fluid
        :min="1"
        :max="maxWeekInStartYear"
        show-buttons
      />
    </div>
    <div class="flex flex-col gap-2">
      <label for="rollout-year" class="text-sm font-medium text-[var(--text-1)]">Jahr</label>
      <PrimeInputNumber
        v-model="startYear"
        input-id="rollout-year"
        fluid
        :min="2020"
        :max="2100"
        :use-grouping="false"
        show-buttons
      />
    </div>
  </div>

  <p v-if="startsInPast" class="text-sm text-[var(--warning-ink)]">
    <i class="pi pi-exclamation-triangle mr-1" aria-hidden="true"></i>
    Die Startwoche liegt in der Vergangenheit (heute ist KW {{ today.week }}/{{ today.year }}).
  </p>

  <fieldset class="space-y-2">
    <legend class="mb-2 text-sm font-medium text-[var(--text-1)]">Bis wann?</legend>
    <label class="flex cursor-pointer items-center gap-3 text-sm text-[var(--text-2)]">
      <PrimeRadioButton v-model="untilYearEnd" :value="true" input-id="rollout-year-end" />
      <span>
        Bis Jahresende
        <span class="text-[var(--text-3)]">(KW {{ maxWeekInStartYear }}/{{ startYear }})</span>
      </span>
    </label>
    <label class="flex cursor-pointer flex-wrap items-center gap-3 text-sm text-[var(--text-2)]">
      <PrimeRadioButton v-model="untilYearEnd" :value="false" input-id="rollout-count" />
      <span>Eine bestimmte Anzahl Wochen</span>
      <PrimeInputNumber
        v-if="!untilYearEnd"
        v-model="weekCount"
        aria-label="Anzahl Wochen"
        :min="1"
        :max="53"
        show-buttons
        suffix=" Wochen"
        class="w-40"
      />
    </label>
  </fieldset>
</template>
