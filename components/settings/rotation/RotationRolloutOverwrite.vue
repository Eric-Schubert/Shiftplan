<script setup lang="ts">
defineProps<{
  plannedCount: number;
  totalCount: number;
}>();

const overwrite = defineModel<boolean>({ required: true });
const { t } = useI18n();
</script>

<template>
  <div class="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--text-2)]">
    <i18n-t keypath="settings.rollout.overwrite.planned" tag="p" class="text-[var(--text-1)]">
      <template #weeks>
        <strong>{{ t("settings.rollout.overwrite.plannedWeeks", { planned: plannedCount, total: totalCount }) }}</strong>
      </template>
    </i18n-t>
    <label class="mt-3 flex cursor-pointer items-start gap-3">
      <PrimeCheckbox v-model="overwrite" input-id="rollout-overwrite" binary class="mt-0.5" />
      <span>
        <span class="block font-medium text-[var(--text-1)]">{{ t("settings.rollout.overwrite.label") }}</span>
        <span class="block leading-5">
          {{ overwrite ? t("settings.rollout.overwrite.on") : t("settings.rollout.overwrite.off") }}
        </span>
      </span>
    </label>
  </div>
</template>
