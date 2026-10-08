<script setup lang="ts">
// Preset shift colors; the chosen one is ringed.
const color = defineModel<string>();

const colorOptions = [
  { value: "#22c55e" },
  { value: "#3b82f6" },
  { value: "#8b5cf6" },
  { value: "#f97316" },
  { value: "#ef4444" },
  { value: "#06b6d4" },
];
</script>

<template>
  <div class="flex flex-col gap-2">
    <label class="font-medium">Farbe</label>
    <div class="flex flex-wrap gap-2">
      <button
        v-for="option in colorOptions"
        :key="option.value"
        type="button"
        class="h-10 w-10 rounded-full border-2 transition-transform hover:scale-110"
        :class="{
          'scale-110 border-gray-900 dark:border-white': color === option.value,
          'border-transparent': color !== option.value,
        }"
        :style="{ backgroundColor: option.value }"
        :aria-label="`Farbe ${option.value} auswählen`"
        @click="color = option.value"
      />
    </div>
  </div>
</template>
