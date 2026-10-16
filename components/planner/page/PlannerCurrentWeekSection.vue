<script setup lang="ts">
import type { ShiftDayChange, ShiftWithStaff } from "~/types/shiftplan";
import type { Absence } from "~/types/absence";

const props = defineProps<{
  absences: Absence[];
  dayChanges: ShiftDayChange[];
  pending: boolean;
  hasShiftplan: boolean;
  shiftList: ShiftWithStaff[];
  coverageNote: string;
  canEditShifts: boolean;
  isAdmin: boolean;
  year: number;
  week: number;
  workdays: string[];
  /** Date → short holiday name. */
  holidays: Map<string, string>;
  /** Work days without holidays. */
  coverageDates: string[];
  /** Signed-in staff member, whose name is marked and who may withdraw own absences. */
  myStaffId?: number | null;
}>();

const emit = defineEmits<{
  (e: "updated"): void;
  (e: "generate"): void;
}>();

// Everyone reads the week grid; planners switch to the cards to edit the plan.
const view = ref<"week" | "plan">("week");

// Lives here so it stays open while the week reloads after each change.
const dayShiftId = ref<number | null>(null);
const dayShift = computed(() => props.shiftList.find((shift) => shift.shift_id === dayShiftId.value) ?? null);
const dayDialogVisible = computed({
  get: () => dayShift.value !== null,
  set: (value: boolean) => {
    if (!value) dayShiftId.value = null;
  },
});

const totalAssigned = computed(() => props.shiftList.reduce((sum, shift) => sum + shift.assigned_staff.length, 0));
</script>

<template>
  <section class="planner-current-week">
    <div class="planner-section-heading !mb-3">
      <h3 class="text-sm font-semibold text-[var(--text-1)]">{{ $t("planner.week.section.shifts") }}</h3>
      <div v-if="shiftList.length > 0" class="flex flex-wrap items-center justify-end gap-2">
        <PlannerViewSwitch v-if="canEditShifts" v-model="view" />
        <span class="planner-chip tabular-nums">{{ coverageNote }}</span>
      </div>
    </div>

    <PlannerShiftSkeleton v-if="pending" />

    <template v-else-if="hasShiftplan">
      <div v-if="shiftList.length === 0" class="planner-empty">
        <i class="pi pi-calendar text-3xl text-[var(--text-3)]" aria-hidden="true"></i>
        <div class="space-y-1.5">
          <h4 class="text-base font-semibold text-[var(--text-1)]">{{ $t("planner.week.section.emptyTitle") }}</h4>
          <p class="mx-auto max-w-[36rem] text-sm leading-6">
            {{ $t("planner.week.section.emptyText") }}
          </p>
        </div>
        <NuxtLink v-if="isAdmin" to="/settings">
          <PrimeButton :label="$t('planner.week.section.toSettings')" icon="pi pi-arrow-right" icon-pos="right" size="small" class="min-h-9" />
        </NuxtLink>
      </div>

      <ShiftWeekGrid
        v-else-if="view === 'week'"
        :shifts="shiftList"
        :workdays="workdays"
        :holidays="holidays"
        :day-changes="dayChanges"
        :absences="absences"
        :can-edit="canEditShifts"
        :my-staff-id="myStaffId"
        @edit-days="dayShiftId = $event"
      />

      <div v-else class="planner-shift-list">
        <ShiftCard
          v-for="shift in shiftList"
          :key="shift.shift_id"
          :shift="shift"
          :year="year"
          :week="week"
          :coverage-dates="coverageDates"
          :day-changes="dayChanges"
          :my-staff-id="myStaffId"
          @updated="emit('updated')"
          @edit-days="dayShiftId = $event"
        />
      </div>

      <PlannerAbsencesPanel
        v-if="shiftList.length > 0"
        :absences="absences"
        :can-edit="canEditShifts"
        :my-staff-id="myStaffId"
        :year="year"
        :week="week"
        @updated="emit('updated')"
      />

      <div
        v-if="shiftList.length > 0 && totalAssigned === 0"
        class="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-2)]"
      >
        <span class="rounded-md bg-[var(--warning-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--warning-ink)]">
          {{ $t("planner.week.section.unassigned") }}
        </span>
        <span>{{ $t("planner.week.section.unassignedText") }}</span>
        <button v-if="canEditShifts" type="button" class="font-semibold text-[var(--accent-strong)] hover:underline" @click="emit('generate')">
          {{ $t("planner.week.section.generateNow") }}
        </button>
      </div>
    </template>

    <div v-else class="planner-empty" role="alert">
      <i class="pi pi-wifi text-3xl text-[var(--text-3)]" aria-hidden="true"></i>
      <div class="space-y-1.5">
        <h4 class="text-base font-semibold text-[var(--text-1)]">{{ $t("planner.week.section.loadFailed") }}</h4>
        <p class="mx-auto max-w-[36rem] text-sm leading-6">{{ $t("planner.week.section.loadFailedText") }}</p>
      </div>
      <PrimeButton :label="$t('planner.week.section.reload')" icon="pi pi-refresh" size="small" class="min-h-9" @click="emit('updated')" />
    </div>

    <LazyDayChangeDialog
      v-if="dayShift"
      v-model:visible="dayDialogVisible"
      :shift="dayShift"
      :year="year"
      :week="week"
      :day-changes="dayChanges.filter((change) => change.shift_id === dayShift!.shift_id)"
      @updated="emit('updated')"
    />
  </section>
</template>
