<script setup lang="ts">
defineProps<{
  stepCount: number;
  rolledOut: boolean;
}>();

const emit = defineEmits<{
  (e: "close"): void;
}>();

const activeStep = defineModel<number>("activeStep", { required: true });
</script>

<template>
  <div class="flex w-full items-center justify-between gap-2">
    <PrimeButton label="Schließen" text class="min-h-11" @click="emit('close')" />
    <div class="flex gap-2">
      <PrimeButton
        v-if="activeStep > 0"
        label="Zurück"
        severity="secondary"
        text
        class="min-h-11"
        @click="activeStep -= 1"
      />
      <PrimeButton
        v-if="activeStep < stepCount - 1"
        label="Weiter"
        icon="pi pi-arrow-right"
        icon-pos="right"
        class="min-h-11"
        @click="activeStep += 1"
      />
      <PrimeButton
        v-else-if="rolledOut"
        label="Fertig"
        icon="pi pi-check"
        class="min-h-11"
        @click="emit('close')"
      />
    </div>
  </div>
</template>
