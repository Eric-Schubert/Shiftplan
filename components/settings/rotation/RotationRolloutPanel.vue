<script setup lang="ts">
import type { GenerationResult } from "~/types/shiftplan";

const props = defineProps<{
  initialYear: number;
  initialWeek: number;
}>();

const emit = defineEmits<{
  (e: "generated", result: GenerationResult): void;
}>();

const {
  startYear,
  startWeek,
  untilYearEnd,
  weekCount,
  overwrite,
  preview,
  loadingPreview,
  generating,
  errorMessage,
  result,
  maxWeekInStartYear,
  plannedWeeks,
  affectedWeeks,
  generate,
} = useRotationRollout(props.initialYear, props.initialWeek, (generated) => emit("generated", generated));

const { t } = useI18n();
const dayChangesInAffectedWeeks = computed(() => affectedWeeks.value.reduce((total, week) => total + week.day_changes, 0));

const submitLabel = computed(() => {
  if (loadingPreview.value && preview.value.length === 0) return t("settings.rollout.submit.loading");
  const count = affectedWeeks.value.length;
  if (count === 0) return t("settings.rollout.submit.nothing");
  const label = t("settings.rollout.submit.weeks", count);
  return overwrite.value && plannedWeeks.value.length > 0 ? t("settings.rollout.submit.overwriting", { label, count: plannedWeeks.value.length }) : label;
});
</script>

<template>
  <div class="space-y-4">
    <RotationRolloutRange
      v-model:start-week="startWeek"
      v-model:start-year="startYear"
      v-model:until-year-end="untilYearEnd"
      v-model:week-count="weekCount"
      :max-week-in-start-year="maxWeekInStartYear"
    />

    <RotationRolloutOverwrite v-if="plannedWeeks.length > 0" v-model="overwrite" :planned-count="plannedWeeks.length" :total-count="preview.length" />

    <p v-if="dayChangesInAffectedWeeks > 0" class="rounded-xl bg-[var(--info-soft)] px-4 py-3 text-sm leading-6 text-[var(--info-ink)]">
      <i class="pi pi-info-circle mr-1" aria-hidden="true"></i>
      {{ t("settings.rollout.dayChanges", dayChangesInAffectedWeeks) }}
    </p>

    <RotationRolloutPreviewList :preview="preview" :loading="loadingPreview" :start-week="startWeek" :start-year="startYear" :overwrite="overwrite" />

    <div v-if="result" class="rounded-xl bg-[var(--positive-soft)] px-4 py-3 text-sm text-[var(--positive-ink)]">
      <i class="pi pi-check-circle mr-1" aria-hidden="true"></i>
      <template v-if="result.generated > 0">
        {{ t("settings.rollout.result.generated", result.generated)
        }}<template v-if="result.overwritten > 0">{{ t("settings.rollout.result.overwritten", { count: result.overwritten }) }}</template
        ><template v-if="result.skipped > 0">{{ t("settings.rollout.result.skipped", { count: result.skipped }) }}</template
        >.
      </template>
      <template v-else>{{ t("settings.rollout.result.nothing") }}</template>
    </div>

    <div v-if="errorMessage" class="rounded-xl bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger-ink)]">
      {{ errorMessage }}
    </div>

    <PrimeButton
      :label="submitLabel"
      icon="pi pi-sync"
      class="min-h-11 w-full sm:w-auto"
      :severity="overwrite && plannedWeeks.length > 0 ? 'danger' : undefined"
      :loading="generating"
      :disabled="loadingPreview || affectedWeeks.length === 0"
      @click="generate"
    />
  </div>
</template>
