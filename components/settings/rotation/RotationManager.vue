<script setup lang="ts">
const showWizardDialog = ref(false);
</script>

<template>
  <div class="space-y-6">
    <RotationToolbar @open-wizard="showWizardDialog = true" />

    <RotationPatternBoard />

    <RotationWizardDialog
      :visible="showWizardDialog"
      @update:visible="showWizardDialog = $event"
    />
  </div>
</template>
