<script setup lang="ts">
import type { ShiftWithStaff } from "~/types/shiftplan";

const props = defineProps<{
  shift: ShiftWithStaff;
  canEdit: boolean;
}>();

const emit = defineEmits<{
  (e: "drag-start", event: DragEvent, staffId: number, staffName: string): void;
  (e: "drag-end"): void;
  (e: "unassign", staffId: number): void;
  (e: "add"): void;
}>();
</script>

<template>
  <div class="flex flex-wrap items-center justify-start gap-1.5 sm:justify-end">
    <span
      v-for="staff in shift.assigned_staff"
      :key="staff.staff_id"
      class="planner-assignee inline-flex h-8 items-center gap-1 rounded-lg pl-2.5 text-[0.8125rem]"
      :class="canEdit ? 'cursor-grab pr-1 active:cursor-grabbing hover:border-[var(--border-strong)]' : 'pr-2.5'"
      :draggable="canEdit"
      @dragstart="emit('drag-start', $event, staff.staff_id, staff.name)"
      @dragend="emit('drag-end')"
    >
      <span class="planner-assignee__name max-w-[11rem] truncate font-medium sm:max-w-[14rem]">
        {{ staff.name }}
      </span>
      <button
        v-if="canEdit"
        type="button"
        class="inline-flex h-6 w-6 items-center justify-center rounded-md text-[var(--text-3)] transition-colors hover:bg-[var(--danger-soft)] hover:text-[var(--danger-ink)]"
        :aria-label="`${staff.name} aus ${props.shift.name} entfernen`"
        @click.stop="emit('unassign', staff.staff_id)"
      >
        <i class="pi pi-times text-[0.625rem]" aria-hidden="true"></i>
      </button>
    </span>

    <button
      v-if="canEdit"
      type="button"
      class="planner-pill-button"
      :aria-label="`Mitarbeiter zu ${props.shift.name} hinzufügen`"
      @click="emit('add')"
    >
      <i class="pi pi-plus text-[0.7rem]" aria-hidden="true"></i>
      <span>Hinzufügen</span>
    </button>
  </div>
</template>
