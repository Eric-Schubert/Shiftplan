<script setup lang="ts">
import type { MessageKey } from "~/i18n/types";
import { weekOfYearLabel } from "~/shared/utils/format/week";
import type { GenerationPreviewWeek } from "~/types/shiftplan";

const props = defineProps<{
  preview: GenerationPreviewWeek[];
  loading: boolean;
  startWeek: number;
  startYear: number;
  overwrite: boolean;
}>();

const localeTag = useLocaleTag();
const { t } = useI18n();
const lastPreviewWeek = computed(() => props.preview.at(-1));

function weekStatus(week: GenerationPreviewWeek): { label: MessageKey; tone: string } {
  if (week.existing_assignments === 0) {
    return { label: "settings.rollout.preview.new", tone: "bg-[var(--positive-soft)] text-[var(--positive-ink)]" };
  }
  if (props.overwrite) {
    return { label: "settings.rollout.preview.overwritten", tone: "bg-[var(--danger-soft)] text-[var(--danger-ink)]" };
  }
  return { label: "settings.rollout.preview.kept", tone: "bg-[var(--surface-muted)] text-[var(--text-2)]" };
}
</script>

<template>
  <div class="overflow-hidden rounded-xl border border-[var(--border-soft)]">
    <div class="flex items-center justify-between bg-[var(--surface-muted)] px-4 py-2 text-sm font-medium text-[var(--text-1)]">
      <span>
        {{ t("settings.rollout.preview.title") }}
        <template v-if="lastPreviewWeek">
          ·
          {{
            t("settings.range", {
              from: weekOfYearLabel(localeTag, startYear, startWeek),
              to: weekOfYearLabel(localeTag, lastPreviewWeek.year, lastPreviewWeek.week),
            })
          }}
        </template>
      </span>
      <i v-if="loading" class="pi pi-spinner pi-spin text-[var(--text-3)]" aria-hidden="true"></i>
    </div>
    <ul class="max-h-56 divide-y divide-[var(--border-soft)] overflow-y-auto text-sm">
      <li v-for="week in preview" :key="`${week.year}-${week.week}`" class="flex items-center justify-between gap-3 px-4 py-1.5">
        <span class="text-[var(--text-1)]">
          {{ weekOfYearLabel(localeTag, week.year, week.week) }}
          <span class="text-[var(--text-3)]">· {{ t("settings.rotation.patternWeek", { week: week.pattern_week }) }}</span>
        </span>
        <span class="rounded-md px-2 py-0.5 text-xs font-semibold" :class="weekStatus(week).tone">
          {{ t(weekStatus(week).label) }}
        </span>
      </li>
    </ul>
  </div>
</template>
