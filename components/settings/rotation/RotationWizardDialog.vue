<script setup lang="ts">
import { getIsoWeekOfDate } from "~/utils/rotation";

const props = defineProps<{
  visible: boolean;
  /** Step to open on, e.g. after the planner edited the pattern in the board. */
  startStep?: number;
}>();

const emit = defineEmits<{
  (e: "update:visible", value: boolean): void;
  /** Closes the wizard so the pattern can be edited in the board; reopening resumes at the review. */
  (e: "edit-board"): void;
}>();

const dataStore = useDataStore();

const steps = [
  { title: "Muster", text: "Übernehmen oder per Excel importieren" },
  { title: "Prüfen", text: "Besetzung je Musterwoche ansehen" },
  { title: "Ausrollen", text: "Wochenpläne erzeugen" },
];

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit("update:visible", value),
});

const today = getIsoWeekOfDate(new Date());
const excelFileInput = ref<HTMLInputElement | null>(null);
const activeStep = ref(0);
const editingConfig = ref(false);
const rolledOut = ref(false);

const {
  downloadingTemplate,
  checkingFile,
  importingExcel,
  excelError,
  pendingImport,
  importDone,
  resetExcelImport,
  downloadExcelTemplate,
  checkExcelFile,
  confirmImport,
} = useRotationExcelImport(() => {
  activeStep.value = 1;
});

watch(
  () => props.visible,
  (isVisible) => {
    if (!isVisible) return;
    activeStep.value = props.startStep ?? 0;
    editingConfig.value = false;
    resetExcelImport();
    rolledOut.value = false;
    dataStore.fetchRotation();
  }
);

watch(activeStep, () => {
  pendingImport.value = null;
  editingConfig.value = false;
});
</script>

<template>
  <PrimeDialog
    v-model:visible="dialogVisible"
    header="Rotations-Assistent"
    modal
    :style="{ width: '52rem', maxWidth: 'calc(100vw - 1.5rem)' }"
  >
    <div class="space-y-5">
      <input
        ref="excelFileInput"
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        class="hidden"
        @change="checkExcelFile"
      />

      <RotationWizardSteps v-model:active-step="activeStep" :steps="steps" />

      <section v-if="activeStep === 0" class="space-y-4">
        <RotationWizardPatternInfo v-model:editing="editingConfig" />
        <RotationWizardExcelCard
          :downloading="downloadingTemplate"
          :checking="checkingFile"
          :importing="importingExcel"
          :error="excelError"
          :pending="pendingImport"
          @download="downloadExcelTemplate"
          @upload="excelFileInput?.click()"
          @confirm="confirmImport"
          @cancel="pendingImport = null"
        />
      </section>

      <RotationWizardStepReview
        v-else-if="activeStep === 1"
        :import-done="importDone"
        @edit-board="emit('edit-board')"
      />

      <section v-else class="space-y-4">
        <p class="max-w-[65ch] text-sm leading-6 text-[var(--text-2)]">
          Erzeugt die Wochenpläne aus dem Muster. Wochen, die schon geplant sind, bleiben
          unangetastet, außer du wählst ausdrücklich „überschreiben“.
        </p>
        <RotationRolloutPanel
          :initial-year="today.year"
          :initial-week="today.week"
          @generated="rolledOut = true"
        />
      </section>
    </div>

    <template #footer>
      <RotationWizardFooter
        v-model:active-step="activeStep"
        :step-count="steps.length"
        :rolled-out="rolledOut"
        @close="dialogVisible = false"
      />
    </template>
  </PrimeDialog>
</template>
