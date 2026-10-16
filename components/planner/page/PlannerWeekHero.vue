<script setup lang="ts">
import type { MessageKey } from "~/i18n/types";
import { formatWeekDates, weekLabel } from "~/shared/utils/format/week";

defineProps<{
  selectedWeek: number;
  selectedYear: number;
  isCurrentWeek: boolean;
  currentWeekLabel: MessageKey | null;
  patternWeek?: number | null;
  canEditShifts: boolean;
  generating: boolean;
  fillDisabled: boolean;
}>();

const emit = defineEmits<{
  (e: "previous"): void;
  (e: "today"): void;
  (e: "next"): void;
  (e: "jump", offset: number): void;
  (e: "generate"): void;
  (e: "open-bulk"): void;
  (e: "notify-team"): void;
}>();
const localeTag = useLocaleTag();
const { t } = useI18n();
</script>

<template>
  <header class="planner-hero planner-week-hero flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
    <div class="min-w-0 space-y-1.5">
      <div class="flex flex-wrap items-center gap-2.5">
        <h2 class="planner-headline text-[var(--text-1)]">
          {{ weekLabel(localeTag, selectedWeek) }}
        </h2>
        <span class="planner-chip tabular-nums">{{ selectedYear }}</span>
        <span v-if="currentWeekLabel" class="planner-chip planner-chip--current">{{ t(currentWeekLabel) }}</span>
        <span v-if="patternWeek" class="planner-chip planner-chip--accent">
          {{ t("planner.week.hero.pattern", { week: patternWeek }) }}
        </span>
      </div>
      <p class="text-sm tabular-nums text-[var(--text-2)]">
        {{ formatWeekDates(localeTag, selectedYear, selectedWeek) }}
      </p>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <template v-if="canEditShifts">
        <PrimeButton
          :label="t('planner.week.hero.fillFromPattern')"
          icon="pi pi-sync"
          size="small"
          class="min-h-9"
          :loading="generating"
          :disabled="fillDisabled"
          @click="emit('generate')"
        />
        <PrimeButton
          :label="t('planner.week.hero.severalWeeks')"
          icon="pi pi-calendar-plus"
          severity="secondary"
          size="small"
          outlined
          class="min-h-9"
          :aria-label="t('planner.week.hero.severalWeeksHint')"
          @click="emit('open-bulk')"
        />
        <PrimeButton
          :label="t('planner.week.hero.notifyTeam')"
          icon="pi pi-megaphone"
          severity="secondary"
          size="small"
          outlined
          class="min-h-9"
          @click="emit('notify-team')"
        />
        <span class="mx-1 hidden h-6 w-px bg-[var(--border-soft)] sm:block" aria-hidden="true"></span>
      </template>

      <div class="planner-segmented" role="group" :aria-label="t('planner.week.hero.switchWeek')">
        <button type="button" :aria-label="t('planner.week.hero.previous')" @click="emit('previous')">
          <i class="pi pi-chevron-left text-xs" aria-hidden="true"></i>
        </button>
        <button type="button" :class="{ 'is-active': isCurrentWeek }" :aria-current="isCurrentWeek ? 'date' : undefined" @click="emit('today')">
          {{ t("planner.week.hero.today") }}
        </button>
        <button type="button" :aria-label="t('planner.week.hero.next')" @click="emit('next')">
          <i class="pi pi-chevron-right text-xs" aria-hidden="true"></i>
        </button>
      </div>

      <div class="planner-segmented hidden sm:inline-flex" role="group" :aria-label="t('planner.week.hero.jump')">
        <button
          v-for="offset in [1, 2, 4]"
          :key="offset"
          type="button"
          class="tabular-nums"
          :aria-label="t('planner.week.hero.jumpBy', { count: offset })"
          @click="emit('jump', offset)"
        >
          +{{ offset }}
        </button>
      </div>
    </div>
  </header>
</template>
