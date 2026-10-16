<script setup lang="ts">
// Asks before a shorter cycle deletes the pattern weeks beyond it, with their assignments, for good.
defineProps<{ from: number; to: number; assignments: number; saving: boolean }>();
const emit = defineEmits<{ (e: "confirm"): void }>();
const visible = defineModel<boolean>("visible", { required: true });
const { t } = useI18n();
</script>

<template>
  <PrimeDialog
    v-model:visible="visible"
    :header="t('settings.rotation.config.shrink.header')"
    modal
    :style="{ width: '28rem', maxWidth: 'calc(100vw - 1.5rem)' }"
  >
    <p class="text-sm leading-6">
      {{
        t(
          "settings.rotation.config.shrink.text",
          {
            from: t("settings.rotation.config.shrink.cycleWeeks", from),
            to: t("settings.rotation.config.shrink.cycleWeeks", to),
            first: to + 1,
            last: from,
            assignments: t("settings.rotation.assignments", assignments),
          },
          from - to
        )
      }}
    </p>
    <template #footer>
      <PrimeButton :label="t('common.actions.cancel')" text @click="visible = false" />
      <PrimeButton :label="t('settings.rotation.config.shrink.confirm')" severity="danger" class="min-h-11" :loading="saving" @click="emit('confirm')" />
    </template>
  </PrimeDialog>
</template>
