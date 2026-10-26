<script setup lang="ts">
defineProps<{
  stepCount: number;
  rolledOut: boolean;
  /** A checked Excel file waits for "replace"; next then imports it instead of dropping it. */
  importPending: boolean;
  importing: boolean;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "confirm-import"): void;
}>();

const activeStep = defineModel<number>("activeStep", { required: true });
</script>

<template>
  <div class="flex w-full items-center justify-between gap-2">
    <PrimeButton :label="$t('common.actions.close')" text class="min-h-11" @click="emit('close')" />
    <div class="flex gap-2">
      <PrimeButton v-if="activeStep > 0" :label="$t('common.actions.back')" severity="secondary" text class="min-h-11" @click="activeStep -= 1" />
      <PrimeButton
        v-if="importPending"
        :label="$t('settings.wizard.excel.replaceAndNext')"
        icon="pi pi-arrow-right"
        icon-pos="right"
        class="min-h-11"
        :loading="importing"
        @click="emit('confirm-import')"
      />
      <PrimeButton
        v-else-if="activeStep < stepCount - 1"
        :label="$t('common.actions.next')"
        icon="pi pi-arrow-right"
        icon-pos="right"
        class="min-h-11"
        @click="activeStep += 1"
      />
      <PrimeButton v-else-if="rolledOut" :label="$t('common.actions.done')" icon="pi pi-check" class="min-h-11" @click="emit('close')" />
    </div>
  </div>
</template>
