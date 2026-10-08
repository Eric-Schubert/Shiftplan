<script setup lang="ts">
import type { WeeklyShiftplan } from "~/types/shiftplan";
import backendConfig from "../../config/backend.config.json";

// One upcoming week: assignment count, holidays and who works which shift.
const props = defineProps<{
  week: { year: number; week: number; dateRange: string };
  plan?: WeeklyShiftplan | null;
  loading: boolean;
}>();
const emit = defineEmits<{ (e: "select"): void }>();

const shifts = computed(() => {
  if (!props.plan?.shifts || props.plan.shifts.length === 0) {
    return null;
  }

  const shiftsWithStaff = props.plan.shifts
    .filter((shift) => shift.assigned_staff && shift.assigned_staff.length > 0)
    .map((shift) => ({
      name: shift.name,
      color: shift.color || backendConfig.validation.shift.defaultColor,
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
        <h4 class="text-base font-semibold text-[var(--text-1)]">KW {{ week.week }}</h4>
        <span class="text-xs tabular-nums text-[var(--text-3)]">{{ week.dateRange }}</span>
      </div>
      <span class="text-xs tabular-nums text-[var(--text-3)]">
        {{ assignmentCount }} Zuweisungen
      </span>
    </div>

    <div class="flex flex-1 flex-col gap-3 px-4 py-3">
      <div v-if="loading" class="flex items-center justify-center py-4 text-[var(--text-3)]">
        <i class="pi pi-spin pi-spinner text-sm" aria-hidden="true"></i>
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
