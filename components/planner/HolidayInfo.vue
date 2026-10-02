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
  <div v-if="loading && !hasContent && !compact" class="flex items-center gap-2 text-sm text-[var(--text-2)]">
    <i class="pi pi-spin pi-spinner"></i>
    <span v-if="!compact && !banner">Kalenderhinweise werden geladen.</span>
  </div>

  <div
    v-else-if="error && !hasContent && !banner"
    class="text-sm text-[var(--danger-ink)]"
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
    v-else-if="!banner && !compact"
    class="text-sm text-[var(--text-3)]"
  >
    Keine Feiertage oder Ferien in dieser Woche.
  </div>
</template>
