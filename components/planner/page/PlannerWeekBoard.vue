<script setup lang="ts">
import type { StyleValue } from "vue";
import type { ShiftWithStaff, WeeklyShiftplanWithPattern } from "~/types/shiftplan";
import type { Absence } from "~/types/absence";

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
const fullyStaffedShifts = computed(() =>
  shiftList.value.filter((shift) => shift.assigned_staff.length >= shift.min_staff).length
);
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
