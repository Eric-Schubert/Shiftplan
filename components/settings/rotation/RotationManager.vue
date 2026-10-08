<script setup lang="ts">
const showWizardDialog = ref(false);
/** Set while the planner edits the pattern in the board on the wizard's behalf. */
const resumeStep = ref<number | null>(null);
const board = ref<HTMLElement | null>(null);

function openWizard() {
  showWizardDialog.value = true;
}

function handleWizardVisible(value: boolean) {
  showWizardDialog.value = value;
  if (!value) resumeStep.value = null;
}

function editInBoard() {
  showWizardDialog.value = false;
  resumeStep.value = 1;
  nextTick(() => board.value?.scrollIntoView({ behavior: "smooth", block: "start" }));
}
</script>

<template>
  <div class="space-y-6">
    <RotationToolbar :resumable="resumeStep !== null" @open-wizard="openWizard" />

    <div ref="board">
      <RotationPatternBoard />
    </div>

    <RotationWizardDialog
      :visible="showWizardDialog"
      :start-step="resumeStep ?? 0"
      @update:visible="handleWizardVisible"
      @edit-board="editInBoard"
    />
  </div>
</template>
