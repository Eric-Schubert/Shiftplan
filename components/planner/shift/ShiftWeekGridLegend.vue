<script setup lang="ts">
const ITEMS = [
  { label: "Vertretung", swatch: "bg-[var(--info-soft)] ring-[var(--info-ink)]" },
  { label: "offen", swatch: "bg-[var(--danger-soft)] ring-[var(--danger-ink)]" },
  { label: "unterbesetzt", swatch: "bg-[var(--warning-soft)] ring-[var(--warning-ink)]" },
  { label: "Feiertag", swatch: "bg-[var(--positive-soft)] ring-[var(--positive-ink)]" },
];
</script>

<template>
  <div class="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--text-2)]">
    <span v-for="item in ITEMS" :key="item.label" class="inline-flex items-center gap-1.5">
      <span class="h-2.5 w-2.5 rounded-sm ring-1" :class="item.swatch" aria-hidden="true"></span>
      {{ item.label }}
    </span>
  </div>
</template>
