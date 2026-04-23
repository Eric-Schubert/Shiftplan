<script setup lang="ts">
import type { Staff } from "~/types/staff";

const props = defineProps<{
  visible: boolean;
  shiftName: string;
  availableStaff: Staff[];
  assigning: boolean;
}>();

const emit = defineEmits<{
  (e: "update:visible", value: boolean): void;
  (e: "assign", staffId: number): void;
}>();

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit("update:visible", value),
});
</script>

<template>
  <PrimeDialog
    v-model:visible="dialogVisible"
    modal
    :header="`${shiftName} - Mitarbeiter zuweisen`"
    :style="{ width: '24rem', maxWidth: 'calc(100vw - 1.5rem)' }"
  >
    <div v-if="availableStaff.length === 0" class="planner-empty !py-8">
      <i class="pi pi-user-plus text-3xl text-[var(--text-3)]" aria-hidden="true"></i>
      <p class="text-sm">Alle verfügbaren Mitarbeiter sind dieser Schicht bereits zugeordnet.</p>
    </div>

    <div v-else class="space-y-2">
      <button
        v-for="staffMember in availableStaff"
        :key="staffMember.staff_id"
        type="button"
        class="flex w-full items-center justify-between rounded-[18px] border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3 text-left text-sm text-[var(--text-2)] transition hover:border-[var(--accent)] hover:bg-[var(--surface-muted)]"
        :disabled="assigning"
        @click="emit('assign', staffMember.staff_id)"
      >
        <span class="font-medium text-[var(--text-1)]">{{ staffMember.name }}</span>
        <span
          v-if="staffMember.is_parttime"
          class="rounded-full bg-[var(--surface-muted)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-3)]"
        >
          TZ
        </span>
      </button>
    </div>
  </PrimeDialog>
</template>
