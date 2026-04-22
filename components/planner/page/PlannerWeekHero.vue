<script setup lang="ts">
defineProps<{
  selectedWeek: number;
  selectedYear: number;
  formattedWeekRange: string;
  patternWeek?: number | null;
  canEditShifts: boolean;
  generating: boolean;
}>();

const emit = defineEmits<{
  (e: "previous"): void;
  (e: "today"): void;
  (e: "next"): void;
  (e: "jump", offset: number): void;
  (e: "generate"): void;
  (e: "open-bulk"): void;
}>();
</script>

<template>
  <div class="planner-hero planner-week-hero h-full space-y-4">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="space-y-3">
        <p class="planner-kicker hidden sm:block">Wochenansicht</p>
        <div class="flex flex-wrap items-end gap-3">
          <h2 class="planner-headline text-[var(--text-1)]">
            KW {{ selectedWeek }}
          </h2>
          <span class="planner-chip planner-chip--muted">{{ selectedYear }}</span>
          <span v-if="patternWeek" class="planner-chip planner-chip--accent">
            Muster {{ patternWeek }}
          </span>
        </div>
        <p class="text-sm text-[var(--text-2)] sm:text-base">
          {{ formattedWeekRange }}
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <PrimeButton
          icon="pi pi-chevron-left"
          text
          rounded
          class="!h-11 !w-11 border !border-[var(--border-soft)] !bg-[var(--surface)]"
          aria-label="Vorherige Woche anzeigen"
          @click="emit('previous')"
        />
        <PrimeButton
          label="Heute"
          text
          class="min-h-11 !rounded-full border !border-[var(--border-soft)] !bg-[var(--surface)] !px-4"
          @click="emit('today')"
        />
        <PrimeButton
          icon="pi pi-chevron-right"
          text
          rounded
          class="!h-11 !w-11 border !border-[var(--border-soft)] !bg-[var(--surface)]"
          aria-label="Nächste Woche anzeigen"
          @click="emit('next')"
        />
        <div class="hidden items-center gap-2 sm:ml-2 sm:flex">
          <PrimeButton
            v-for="offset in [1, 2, 4]"
            :key="offset"
            :label="`+${offset}`"
            text
            class="min-h-11 !rounded-full border !border-[var(--border-soft)] !bg-[var(--surface)] !px-3"
            :aria-label="`${offset} Wochen vorspringen`"
            @click="emit('jump', offset)"
          />
        </div>
      </div>
    </div>

    <div v-if="canEditShifts" class="flex flex-wrap gap-2">
      <PrimeButton
        label="Aus Muster füllen"
        icon="pi pi-sync"
        severity="secondary"
        class="min-h-11 !rounded-full !px-5"
        :loading="generating"
        @click="emit('generate')"
      />
      <PrimeButton
        label="Mehrere Wochen"
        icon="pi pi-calendar-plus"
        severity="secondary"
        class="min-h-11 !rounded-full !px-5"
        aria-label="Mehrere Wochen aus dem Muster generieren"
        @click="emit('open-bulk')"
      />
    </div>
  </div>
</template>
