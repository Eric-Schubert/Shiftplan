<script setup lang="ts">
import type { Staff } from "~/types/staff";

defineProps<{
  staff: Staff[];
}>();

const emit = defineEmits<{
  (e: "drag-start", event: DragEvent, staff: Staff): void;
}>();
</script>

<template>
  <div class="rounded-lg border bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
    <h4 class="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
      Mitarbeiter-Pool – per Drag & Drop in Schichten ziehen
    </h4>
    <div class="flex flex-wrap gap-1.5">
      <span
        v-for="staffMember in staff"
        :key="staffMember.staff_id"
        class="inline-flex cursor-grab select-none items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700 transition-all hover:bg-blue-200 hover:shadow-md active:cursor-grabbing dark:bg-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-900/60"
        draggable="true"
        @dragstart="emit('drag-start', $event, staffMember)"
      >
        {{ staffMember.name }}
        <span v-if="staffMember.is_parttime" class="text-[10px] opacity-60">TZ</span>
      </span>
    </div>
  </div>
</template>
