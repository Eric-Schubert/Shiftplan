<script setup lang="ts">
// Asks before filling a week from the pattern would replace assignments the planner made by hand.
// `count` is null when the week's plan is not loaded and what it holds is unknown.
defineProps<{ count: number | null; patternWeek: number | null | undefined; generating: boolean }>();
const emit = defineEmits<{ (e: "confirm"): void }>();
const visible = defineModel<boolean>("visible", { required: true });
const { t } = useI18n();
</script>

<template>
  <PrimeDialog v-model:visible="visible" :header="t('planner.week.fill.header')" modal :style="{ width: '28rem', maxWidth: 'calc(100vw - 1.5rem)' }">
    <p class="text-sm leading-6">
      {{ count === null ? t("planner.week.fill.unknown") : t("planner.week.fill.text", { count, week: patternWeek ?? "" }, count) }}
    </p>
    <template #footer>
      <PrimeButton :label="t('common.actions.cancel')" text @click="visible = false" />
      <PrimeButton :label="t('planner.week.fill.confirm')" severity="danger" class="min-h-11" :loading="generating" @click="emit('confirm')" />
    </template>
  </PrimeDialog>
</template>
