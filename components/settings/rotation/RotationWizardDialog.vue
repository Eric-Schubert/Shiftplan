<script setup lang="ts">
import type { MessageKey } from "~/i18n/types";
import { isoWeekOfDate } from "~/shared/utils/week";

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
const { t } = useI18n();

const STEPS = [
  { title: "settings.wizard.steps.pattern.title", text: "settings.wizard.steps.pattern.text" },
  { title: "settings.wizard.steps.review.title", text: "settings.wizard.steps.review.text" },
  { title: "settings.wizard.steps.rollout.title", text: "settings.wizard.steps.rollout.text" },
] as const satisfies readonly { title: MessageKey; text: MessageKey }[];
const steps = computed(() => STEPS.map((step) => ({ title: t(step.title), text: t(step.text) })));

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit("update:visible", value),
});

const today = isoWeekOfDate(new Date());
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
  <PrimeDialog v-model:visible="dialogVisible" :header="t('settings.wizard.header')" modal :style="{ width: '52rem', maxWidth: 'calc(100vw - 1.5rem)' }">
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
        <RotationWizardPatternInfo v-model:editing="editingConfig" :today="today" />
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

      <RotationWizardStepReview v-else-if="activeStep === 1" :import-done="importDone" :today="today" @edit-board="emit('edit-board')" />

      <section v-else class="space-y-4">
        <p class="max-w-[65ch] text-sm leading-6 text-[var(--text-2)]">{{ t("settings.wizard.rolloutIntro") }}</p>
        <RotationRolloutPanel :initial-year="today.year" :initial-week="today.week" @generated="rolledOut = true" />
      </section>
    </div>

    <template #footer>
      <RotationWizardFooter v-model:active-step="activeStep" :step-count="steps.length" :rolled-out="rolledOut" @close="dialogVisible = false" />
    </template>
  </PrimeDialog>
</template>
