<script setup lang="ts">
defineProps<{
  cycleLength: number;
  startWeek: number;
  startYear: number;
}>();
</script>

<template>
  <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
    <div class="flex items-start gap-3">
      <i class="pi pi-info-circle mt-0.5 text-xl text-primary-light dark:text-primary-dark" aria-hidden="true"></i>
      <div class="text-sm text-gray-700 dark:text-gray-300">
        <p class="mb-1 font-medium">So funktioniert das Rotationsmuster:</p>
        <p class="mb-2">
          Lege fest, wer in welcher Woche des Zyklus welche Schicht arbeitet.
          Das Muster wiederholt sich alle <strong>{{ cycleLength }} Wochen</strong>.
        </p>
        <p class="text-xs text-gray-500 dark:text-gray-400">
          <i class="pi pi-calendar mr-1" aria-hidden="true"></i>
          Musterwoche 1 beginnt in KW {{ startWeek }}/{{ startYear }}
        </p>
      </div>
    </div>
  </div>
</template>
