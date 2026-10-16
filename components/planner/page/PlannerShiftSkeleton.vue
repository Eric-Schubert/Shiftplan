<script setup lang="ts">
// Placeholder rows in the shape of ShiftCard while the week loads.
withDefaults(defineProps<{ rows?: number }>(), { rows: 3 });
</script>

<template>
  <div class="planner-shift-list" aria-busy="true" :aria-label="$t('planner.week.section.loading')">
    <div v-for="row in rows" :key="row" class="planner-shift-card flex items-stretch gap-3 sm:gap-4" aria-hidden="true">
      <span class="planner-shift-rail planner-skeleton"></span>
      <div class="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-4 gap-y-2.5">
        <div class="space-y-2">
          <span class="planner-skeleton block h-4 w-20"></span>
          <span class="planner-skeleton block h-3 w-24"></span>
        </div>
        <div class="flex gap-2">
          <span class="planner-skeleton block h-8 w-24"></span>
          <span v-if="row !== rows" class="planner-skeleton block h-8 w-24"></span>
        </div>
      </div>
    </div>
  </div>
</template>
