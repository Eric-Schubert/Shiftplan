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
  (e: "notify-team"): void;
}>();
</script>

<template>
  <header class="planner-hero planner-week-hero flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
    <div class="min-w-0 space-y-1.5">
      <div class="flex flex-wrap items-center gap-2.5">
        <h2 class="planner-headline text-[var(--text-1)]">
          KW {{ selectedWeek }}
        </h2>
        <span class="planner-chip tabular-nums">{{ selectedYear }}</span>
        <span v-if="patternWeek" class="planner-chip planner-chip--accent">
          Muster {{ patternWeek }}
        </span>
      </div>
      <p class="text-sm tabular-nums text-[var(--text-2)]">
        {{ formattedWeekRange }}
      </p>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <template v-if="canEditShifts">
        <PrimeButton
          label="Aus Muster füllen"
          icon="pi pi-sync"
          size="small"
          class="min-h-9"
          :loading="generating"
          @click="emit('generate')"
        />
        <PrimeButton
          label="Mehrere Wochen"
          icon="pi pi-calendar-plus"
          severity="secondary"
          size="small"
          outlined
          class="min-h-9"
          aria-label="Mehrere Wochen aus dem Muster generieren"
          @click="emit('open-bulk')"
        />
        <PrimeButton
          label="Team benachrichtigen"
          icon="pi pi-megaphone"
          severity="secondary"
          size="small"
          outlined
          class="min-h-9"
          @click="emit('notify-team')"
        />
        <span class="mx-1 hidden h-6 w-px bg-[var(--border-soft)] sm:block" aria-hidden="true"></span>
      </template>

      <div class="planner-segmented" role="group" aria-label="Woche wechseln">
        <button type="button" aria-label="Vorherige Woche anzeigen" @click="emit('previous')">
          <i class="pi pi-chevron-left text-xs" aria-hidden="true"></i>
        </button>
        <button type="button" @click="emit('today')">Heute</button>
        <button type="button" aria-label="Nächste Woche anzeigen" @click="emit('next')">
          <i class="pi pi-chevron-right text-xs" aria-hidden="true"></i>
        </button>
      </div>

      <div class="planner-segmented hidden sm:inline-flex" role="group" aria-label="Wochen vorspringen">
        <button
          v-for="offset in [1, 2, 4]"
          :key="offset"
          type="button"
          class="tabular-nums"
          :aria-label="`${offset} Wochen vorspringen`"
          @click="emit('jump', offset)"
        >
          +{{ offset }}
        </button>
      </div>
    </div>
  </header>
</template>
