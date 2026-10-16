<script setup lang="ts">
import { isAppLocale } from "~/i18n/config";

// Language switch in the footer. Each language is named in itself, so everyone finds their own.
const { locale, options, choose } = useLocaleSwitch();
const { t } = useI18n();

function select(value: unknown) {
  if (isAppLocale(value)) void choose(value);
}
</script>

<template>
  <PrimeSelect
    :model-value="locale"
    :options="options"
    option-label="name"
    option-value="code"
    size="small"
    :aria-label="t('app.layout.language')"
    @update:model-value="select"
  >
    <template #option="{ option }">
      <span :lang="option.tag">{{ option.name }}</span>
    </template>
  </PrimeSelect>
</template>
