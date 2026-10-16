<script setup lang="ts">
import { formatWeekDates, weekLabel } from "~/shared/utils/format/week";
import type { WeeklyShiftplan } from "~/types/shiftplan";

// One upcoming week: assignment count, holidays and who works which shift.
const props = defineProps<{
  week: { year: number; week: number };
  plan?: WeeklyShiftplan | null;
  loading: boolean;
}>();
const emit = defineEmits<{ (e: "select"): void }>();
const configStore = useConfigStore();
const { locale } = useI18n();

const shifts = computed(() => {
  if (!props.plan?.shifts || props.plan.shifts.length === 0) {
    return null;
  }

  const shiftsWithStaff = props.plan.shifts
    .filter((shift) => shift.assigned_staff && shift.assigned_staff.length > 0)
    .map((shift) => ({
      name: shift.name,
      color: shift.color || configStore.shift.defaultColor,
      staff: shift.assigned_staff.map((staff) => staff.name),
    }));

  return shiftsWithStaff.length > 0 ? shiftsWithStaff : null;
});

const assignmentCount = computed(() =>
  props.plan?.shifts ? props.plan.shifts.reduce((sum, shift) => sum + shift.assigned_staff.length, 0) : 0
);
</script>

<template>
  <button
    type="button"
    class="planner-preview-card flex w-full flex-col text-left"
    @click="emit('select')"
  >
    <div class="planner-preview-card__header flex items-baseline justify-between gap-3 px-4 py-3">
      <div class="flex items-baseline gap-2">
        <h4 class="text-base font-semibold text-[var(--text-1)]">{{ weekLabel(locale, week.week) }}</h4>
        <span class="text-xs tabular-nums text-[var(--text-3)]">{{ formatWeekDates(locale, week.year, week.week) }}</span>
      </div>
      <span class="text-xs tabular-nums text-[var(--text-3)]">
        {{ assignmentCount }} Zuweisungen
      </span>
    </div>

    <div class="flex flex-1 flex-col gap-3 px-4 py-3">
      <div v-if="loading" class="space-y-2.5 py-1" aria-hidden="true">
        <span class="planner-skeleton block h-3.5 w-3/4"></span>
        <span class="planner-skeleton block h-3.5 w-2/3"></span>
        <span class="planner-skeleton block h-3.5 w-1/2"></span>
      </div>

      <template v-else>
        <HolidayInfo
          :year="week.year"
          :week="week.week"
          compact
        />

        <ul
          v-if="shifts"
          class="space-y-2"
        >
          <li
            v-for="shift in shifts"
            :key="shift.name"
            class="flex items-start gap-2.5"
          >
            <span
              class="mt-0.5 h-4 w-1 flex-shrink-0 rounded-full"
              :style="{ backgroundColor: shift.color }"
              aria-hidden="true"
            ></span>
            <div class="min-w-0 text-[0.8125rem] leading-5">
              <span class="font-semibold text-[var(--text-1)]">{{ shift.name }}</span>
              <span class="text-[var(--text-2)]"> · {{ shift.staff.join(", ") }}</span>
            </div>
          </li>
        </ul>

        <p
          v-else
          class="py-2 text-sm text-[var(--text-3)]"
        >
          Noch nicht geplant.
        </p>
      </template>
    </div>
  </button>
</template>
