<script setup lang="ts">
const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: "update:visible", value: boolean): void;
}>();

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit("update:visible", value),
});

const { sourceYear, targetYear, overwrite, copying, loading, preview, result, error, canCopy, executeCopy } =
  useYearCopy(() => props.visible);
const { t } = useI18n();
</script>

<template>
  <PrimeDialog
    v-model:visible="dialogVisible"
    :header="t('settings.yearCopy.header')"
    modal
    :style="{ width: '30rem', maxWidth: 'calc(100vw - 1.5rem)' }"
  >
    <div class="space-y-4">
      <p class="text-sm text-gray-600 dark:text-gray-400">{{ t("settings.yearCopy.intro") }}</p>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div class="flex flex-col gap-2">
          <label for="copy-source-year" class="text-sm font-medium">{{ t("settings.yearCopy.source") }}</label>
          <PrimeInputNumber
            v-model="sourceYear"
            input-id="copy-source-year"
            :min="2020"
            :max="2100"
            :use-grouping="false"
          />
        </div>

        <div class="flex flex-col gap-2">
          <label for="copy-target-year" class="text-sm font-medium">{{ t("settings.yearCopy.target") }}</label>
          <PrimeInputNumber
            v-model="targetYear"
            input-id="copy-target-year"
            :min="2020"
            :max="2100"
            :use-grouping="false"
          />
        </div>
      </div>

      <div class="flex items-center gap-2">
        <PrimeCheckbox v-model="overwrite" :binary="true" input-id="overwrite" />
        <label for="overwrite" class="text-sm text-gray-700 dark:text-gray-300">
          {{ t("settings.yearCopy.overwrite", { year: targetYear }) }}
        </label>
      </div>

      <YearCopyStatusPanel
        :loading="loading"
        :preview="preview"
        :result="result"
        :error="error"
        :source-year="sourceYear"
        :target-year="targetYear"
        :overwrite="overwrite"
      />
    </div>

    <template #footer>
      <PrimeButton
        :label="t('common.actions.close')"
        text
        class="min-h-11"
        @click="dialogVisible = false"
      />
      <PrimeButton
        :label="t('settings.yearCopy.copy')"
        icon="pi pi-copy"
        class="min-h-11"
        :loading="copying"
        :disabled="!canCopy"
        @click="executeCopy"
      />
    </template>
  </PrimeDialog>
</template>
