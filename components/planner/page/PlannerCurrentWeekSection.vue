<script setup lang="ts">
import type { ShiftWithStaff } from "~/types/shiftplan";

const props = defineProps<{
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
  <section class="planner-slab planner-current-week">
    <div class="planner-section-heading !hidden sm:!flex">
      <div>
        <p class="planner-kicker hidden sm:block">Einsatzplan</p>
        <h3 class="text-lg font-semibold text-[var(--text-1)] sm:mt-2 sm:text-xl">Schichten dieser Woche</h3>
      </div>
      <span v-if="shiftList.length > 0" class="planner-chip planner-chip--muted !hidden sm:!inline-flex">
        {{ coverageNote }}
      </span>
    </div>

    <div v-if="pending" class="flex justify-center py-10">
      <PrimeProgressSpinner />
    </div>

    <template v-else-if="hasShiftplan">
      <div v-if="shiftList.length === 0" class="planner-empty">
        <Icon name="mdi:calendar-blank-outline" class="text-4xl text-[var(--text-3)]" />
        <div class="space-y-2">
          <h4 class="text-lg font-semibold text-[var(--text-1)]">Diese Woche hat noch keine Struktur</h4>
          <p class="mx-auto max-w-[36rem] text-sm leading-6">
            Lege zuerst die Schichten an. Danach wirkt der Plan sofort geordneter und das Team kann verteilt werden.
          </p>
        </div>
        <NuxtLink v-if="isAdmin" to="/settings">
          <PrimeButton label="Zu den Einstellungen" icon="pi pi-arrow-right" class="min-h-11 !rounded-full !px-5" />
        </NuxtLink>
      </div>

      <div v-else class="space-y-2.5 sm:space-y-3">
        <ShiftCard
          v-for="shift in shiftList"
          :key="shift.shift_id"
          :shift="shift"
          :year="year"
          :week="week"
          @updated="emit('updated')"
        />
      </div>

      <div
        v-if="shiftList.length > 0 && totalAssigned === 0"
        class="mt-4 rounded-[20px] border border-[var(--border-soft)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--text-2)]"
      >
        <div class="flex flex-wrap items-center gap-2">
          <span class="rounded-full bg-[var(--warning-soft)] px-3 py-1 text-xs font-semibold text-[var(--warning-ink)]">
            Noch unbesetzt
          </span>
          <span>Die Schichten sind angelegt, aber es wurde noch niemand zugewiesen.</span>
          <button
            v-if="canEditShifts"
            type="button"
            class="font-semibold text-[var(--accent-strong)] underline decoration-transparent underline-offset-4 transition hover:decoration-current"
            @click="emit('generate')"
          >
            Jetzt aus Muster generieren
          </button>
        </div>
      </div>
    </template>
  </section>
</template>
