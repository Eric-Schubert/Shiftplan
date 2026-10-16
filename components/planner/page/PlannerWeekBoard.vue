<script setup lang="ts">
import type { StyleValue } from "vue";
import type { ShiftWithStaff, WeeklyShiftplanWithPattern } from "~/types/shiftplan";
import type { Absence } from "~/types/absence";
import { shortenHolidayName } from "~/utils/holiday";
import { understaffedDates, workDates } from "~/utils/shift-coverage";

const props = defineProps<{
  shiftplan: WeeklyShiftplanWithPattern | null | undefined;
  pending: boolean;
  absences: Absence[];
  myStaffId: number | null;
  swipeClass: string;
  swipeStyle: StyleValue;
}>();

const emit = defineEmits<{
  (e: "updated"): void;
  (e: "generate"): void;
}>();

const appStore = useAppStore();
const authStore = useAuthStore();

const shiftList = computed<ShiftWithStaff[]>(() => props.shiftplan?.shifts ?? []);
const { holidays } = useHolidayWeek(
  computed(() => appStore.selectedYear),
  computed(() => appStore.selectedWeek)
);
const workdays = computed(() => workDates(appStore.selectedYear, appStore.selectedWeek, !appStore.nextWeekFromSaturday));
const holidayNames = computed(() => new Map(holidays.value.map((holiday) => [holiday.date, shortenHolidayName(holiday.name)])));
// Nobody is expected to work on holidays, so they never leave a shift short.
const coverageDates = computed(() => workdays.value.filter((date) => !holidayNames.value.has(date)));

// A shift is only fully staffed when every work day is covered after day changes and absences.
const fullyStaffedShifts = computed(() => {
  const dayChanges = props.shiftplan?.day_changes ?? [];
  return shiftList.value.filter((shift) => understaffedDates(shift, coverageDates.value, dayChanges, props.absences).length === 0).length;
});
const coverageNote = computed(() =>
  shiftList.value.length === 0
    ? "Noch keine Planbasis"
    : `${fullyStaffedShifts.value}/${shiftList.value.length} Schichten im Soll`
);
</script>

<template>
  <section class="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-6">
    <div
      class="swipe-content min-w-0 space-y-4"
      :class="swipeClass"
      :style="swipeStyle"
    >
      <div class="lg:hidden">
        <HolidayInfo
          :year="appStore.selectedYear"
          :week="appStore.selectedWeek"
          banner
        />
      </div>

      <PlannerCurrentWeekSection
        :pending="pending"
        :has-shiftplan="!!shiftplan"
        :shift-list="shiftList"
        :coverage-note="coverageNote"
        :can-edit-shifts="authStore.canEditShifts"
        :is-admin="authStore.isAdmin"
        :year="appStore.selectedYear"
        :week="appStore.selectedWeek"
        :absences="absences"
        :day-changes="shiftplan?.day_changes ?? []"
        :workdays="workdays"
        :holidays="holidayNames"
        :coverage-dates="coverageDates"
        :my-staff-id="myStaffId"
        @updated="emit('updated')"
        @generate="emit('generate')"
      />
    </div>

    <aside class="planner-panel hidden lg:block">
      <div class="mb-3 flex items-center justify-between gap-3">
        <h3 class="text-sm font-semibold text-[var(--text-1)]">Kalender</h3>
        <span class="inline-flex items-center gap-1.5 text-xs text-[var(--text-3)]">
          <span
            class="h-1.5 w-1.5 rounded-full"
            :class="pending ? 'bg-amber-500' : 'bg-emerald-500'"
            aria-hidden="true"
          ></span>
          {{ pending ? "Aktualisiert" : "Aktuell" }}
        </span>
      </div>
      <HolidayInfo
        :year="appStore.selectedYear"
        :week="appStore.selectedWeek"
      />
    </aside>
  </section>
</template>
