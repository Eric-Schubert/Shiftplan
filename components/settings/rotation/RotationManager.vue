<script setup lang="ts">
const showConfigDialog = ref(false);
const showGenerateDialog = ref(false);
</script>

<template>
  <div class="space-y-6">
    <RotationToolbar
      @configure="showConfigDialog = true"
      @generate="showGenerateDialog = true"
    />

    <RotationPatternBoard />

    <RotationConfigDialog
      :visible="showConfigDialog"
      @update:visible="showConfigDialog = $event"
    />

    <RotationGenerateDialog
      :visible="showGenerateDialog"
      @update:visible="showGenerateDialog = $event"
    />
  </div>
</template>
