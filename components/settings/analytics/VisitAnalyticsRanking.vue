<script setup lang="ts">
import { formatNumber } from "~/utils/analytics/format";

defineProps<{
  kicker: string;
  title: string;
  items: { key: string; label: string; pageViews: number; uniqueVisitors: number }[];
  emptyIcon: string;
  emptyText: string;
}>();
</script>

<template>
  <section class="planner-panel min-w-0">
    <div class="planner-section-heading">
      <div>
        <p class="planner-kicker">{{ kicker }}</p>
        <h4 class="mt-1 text-base font-semibold text-[var(--text-1)]">{{ title }}</h4>
      </div>
    </div>

    <div v-if="items.length > 0" class="space-y-2">
      <div
        v-for="item in items"
        :key="item.key"
        class="flex items-center justify-between gap-3 rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2.5"
      >
        <div class="min-w-0">
          <p class="truncate text-sm font-semibold text-[var(--text-1)]">
            {{ item.label }}
          </p>
          <p class="text-xs text-[var(--text-3)]">
            {{ formatNumber(item.uniqueVisitors) }} individuelle Zugriffe
          </p>
        </div>
        <span class="planner-chip planner-chip--muted flex-shrink-0">
          {{ formatNumber(item.pageViews) }}
        </span>
      </div>
    </div>

    <div v-else class="planner-empty !py-8">
      <i :class="`pi ${emptyIcon} text-2xl`" aria-hidden="true"></i>
      <span>{{ emptyText }}</span>
    </div>
  </section>
</template>
