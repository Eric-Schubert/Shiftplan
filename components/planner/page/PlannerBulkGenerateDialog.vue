<script setup lang="ts">
const props = defineProps<{
  visible: boolean;
  year: number;
  week: number;
}>();

const emit = defineEmits<{
  (e: "update:visible", value: boolean): void;
  (e: "generated"): void;
}>();

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit("update:visible", value),
});
</script>

<template>
  <PrimeDialog
    v-model:visible="dialogVisible"
    modal
    header="Mehrere Wochen generieren"
    :style="{ width: '34rem', maxWidth: 'calc(100vw - 1.5rem)' }"
  >
    <RotationRolloutPanel :initial-year="year" :initial-week="week" @generated="emit('generated')" />

    <template #footer>
      <PrimeButton label="Schließen" text class="min-h-11" @click="dialogVisible = false" />
    </template>
  </PrimeDialog>
</template>
