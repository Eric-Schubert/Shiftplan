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
}>();

const emit = defineEmits<{
  (e: "updated"): void;
  (e: "generate"): void;
}>();

const totalAssigned = computed(() =>
  props.shiftList.reduce((sum, shift) => sum + shift.assigned_staff.length, 0)
);
</script>

<template>
  <section class="planner-current-week">
    <div class="planner-section-heading !mb-3">
      <h3 class="text-sm font-semibold text-[var(--text-1)]">Schichten</h3>
      <span v-if="shiftList.length > 0" class="planner-chip tabular-nums">
        {{ coverageNote }}
      </span>
    </div>

    <div v-if="pending" class="planner-shift-list flex justify-center py-10">
      <PrimeProgressSpinner class="!h-8 !w-8" />
    </div>

    <template v-else-if="hasShiftplan">
      <div v-if="shiftList.length === 0" class="planner-empty">
        <i class="pi pi-calendar text-3xl text-[var(--text-3)]" aria-hidden="true"></i>
        <div class="space-y-1.5">
          <h4 class="text-base font-semibold text-[var(--text-1)]">Diese Woche hat noch keine Struktur</h4>
          <p class="mx-auto max-w-[36rem] text-sm leading-6">
            Lege zuerst die Schichten an. Danach kann das Team verteilt werden.
          </p>
        </div>
        <NuxtLink v-if="isAdmin" to="/settings">
          <PrimeButton label="Zu den Einstellungen" icon="pi pi-arrow-right" icon-pos="right" size="small" class="min-h-9" />
        </NuxtLink>
      </div>

      <div v-else class="planner-shift-list">
        <ShiftCard
          v-for="shift in shiftList"
          :key="shift.shift_id"
          :shift="shift"
          :year="year"
          :week="week"
          :absences="absences"
          :day-changes="dayChanges"
          @updated="emit('updated')"
        />
      </div>

      <PlannerAbsencesPanel
        v-if="shiftList.length > 0"
        :absences="absences"
        :can-edit="canEditShifts"
        :year="year"
        :week="week"
        @updated="emit('updated')"
      />

      <div
        v-if="shiftList.length > 0 && totalAssigned === 0"
        class="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-2)]"
      >
        <span class="rounded-md bg-[var(--warning-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--warning-ink)]">
          Noch unbesetzt
        </span>
        <span>Die Schichten sind angelegt, aber es wurde noch niemand zugewiesen.</span>
        <button
          v-if="canEditShifts"
          type="button"
          class="font-semibold text-[var(--accent-strong)] hover:underline"
          @click="emit('generate')"
        >
          Jetzt aus Muster generieren
        </button>
      </div>
    </template>
  </section>
</template>
