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
  <div class="flex flex-wrap items-center justify-end gap-2 sm:gap-2.5">
    <span
      v-for="staff in shift.assigned_staff"
      :key="staff.staff_id"
      class="planner-assignee inline-flex min-h-10 items-center gap-2 rounded-full px-3 py-1 text-sm shadow-sm sm:min-h-11 sm:py-1.5"
      :class="{
        'cursor-grab active:cursor-grabbing hover:border-[var(--accent)] hover:bg-[var(--surface)]': canEdit,
      }"
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
        class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--text-3)] transition-colors hover:bg-[var(--danger-soft)] hover:text-[var(--danger-ink)]"
        :aria-label="`${staff.name} aus ${props.shift.name} entfernen`"
        @click.stop="emit('unassign', staff.staff_id)"
      >
        <Icon name="mdi:close" class="text-xs" />
      </button>
    </span>

    <button
      v-if="canEdit"
      type="button"
      class="planner-pill-button border-dashed"
      :aria-label="`Mitarbeiter zu ${props.shift.name} hinzufügen`"
      @click="emit('add')"
    >
      <Icon name="mdi:plus" class="text-sm" />
      <span>Hinzufügen</span>
    </button>
  </div>
</template>
