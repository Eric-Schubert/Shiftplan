<script setup lang="ts">
interface Props {
  year: number;
  week: number;
  compact?: boolean;
  banner?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  compact: false,
  banner: false,
});

const { holidays, schoolHolidays, loading, error } = useHolidayWeek(
  toRef(props, "year"),
  toRef(props, "week")
);

const hasContent = computed(() => holidays.value.length > 0 || schoolHolidays.value.length > 0);
</script>

<template>
  <div v-if="loading && !hasContent" class="flex items-center gap-2 text-sm text-[var(--text-2)]">
    <i class="pi pi-spin pi-spinner"></i>
    <span v-if="!compact && !banner">Kalenderhinweise werden geladen.</span>
  </div>

  <div
    v-else-if="error && !hasContent && !banner"
    class="rounded-[18px] border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--danger-ink)]"
  >
    <span v-if="!compact">{{ error }}</span>
  </div>

  <HolidayBannerCard
    v-else-if="banner && hasContent"
    :holidays="holidays"
    :school-holidays="schoolHolidays"
  />

  <div v-else-if="hasContent">
    <HolidayCompactList
      v-if="compact"
      :holidays="holidays"
      :school-holidays="schoolHolidays"
    />

    <HolidayDetailPanels
      v-else
      :holidays="holidays"
      :school-holidays="schoolHolidays"
    />
  </div>

  <div
    v-else-if="!banner"
    class="rounded-[20px] border border-dashed border-[var(--border-strong)] bg-[var(--surface)] px-4 py-5 text-sm text-[var(--text-2)]"
  >
    Keine Feiertage oder Ferien in dieser Kalenderwoche.
  </div>
</template>
