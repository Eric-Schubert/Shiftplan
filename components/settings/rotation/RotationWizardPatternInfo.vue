<script setup lang="ts">
import { weekOfYearLabel } from "~/shared/utils/format/week";

const props = defineProps<{ today: { year: number; week: number } }>();
const editing = defineModel<boolean>("editing", { required: true });

const { today, rotationConfig, assignmentCount, currentPatternWeek } = useRotationPatternSummary(props.today);
const localeTag = useLocaleTag();
const { t } = useI18n();
</script>

<template>
  <div class="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-4">
    <p class="planner-kicker">{{ t("settings.wizard.current.title") }}</p>
    <div v-if="rotationConfig" class="mt-2 flex flex-wrap items-center gap-2">
      <span class="planner-chip planner-chip--accent">{{ t("settings.rotation.cycle", { weeks: rotationConfig.cycle_length }) }}</span>
      <span class="planner-chip">
        {{
          t("settings.wizard.current.firstWeek", {
            week: weekOfYearLabel(localeTag, rotationConfig.start_year, rotationConfig.start_week),
          })
        }}
      </span>
      <span class="planner-chip">{{ t("settings.rotation.assignments", assignmentCount) }}</span>
    </div>
    <p v-if="currentPatternWeek" class="mt-3 text-sm text-[var(--text-2)]">
      {{
        t("settings.wizard.current.thisWeek", {
          week: weekOfYearLabel(localeTag, today.year, today.week),
          pattern: currentPatternWeek,
        })
      }}
      <button
        v-if="!editing"
        type="button"
        class="ml-1 font-medium text-[var(--accent-strong)] underline-offset-2 hover:underline"
        @click="editing = true"
      >
        {{ t("settings.wizard.current.changeStart") }}
      </button>
    </p>

    <div v-if="editing" class="mt-4 border-t border-[var(--border-soft)] pt-4">
      <RotationConfigForm @saved="editing = false" @cancel="editing = false" />
    </div>
  </div>
</template>
