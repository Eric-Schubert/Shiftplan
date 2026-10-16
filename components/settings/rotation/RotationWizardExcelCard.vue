<script setup lang="ts">
import { weekOfYearLabel } from "~/shared/utils/format/week";
import type { RotationExcelImportResult } from "~/types/rotation";

const props = defineProps<{
  downloading: boolean;
  checking: boolean;
  importing: boolean;
  error: string | null;
  pending: { file: File; check: RotationExcelImportResult } | null;
}>();

const emit = defineEmits<{
  (e: "download"): void;
  (e: "upload"): void;
  (e: "confirm"): void;
  (e: "cancel"): void;
}>();

const { assignmentCount } = useRotationPatternSummary();
const localeTag = useLocaleTag();
const { t } = useI18n();
// The four how-to lines, in order.
const HOW_TO = ["prepare", "download", "fill", "upload"] as const;
const importConfirm = ref<HTMLElement | null>(null);

watch(
  () => props.pending,
  async (pending) => {
    if (!pending) return;
    await nextTick();
    importConfirm.value?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
);
</script>

<template>
  <div class="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-4">
    <p class="font-semibold text-[var(--text-1)]">
      {{ t("settings.wizard.excel.title") }}
      <span class="font-normal text-[var(--text-3)]">{{ t("settings.wizard.excel.optional") }}</span>
    </p>
    <i18n-t keypath="settings.wizard.excel.intro" tag="p" class="mt-1 max-w-[65ch] text-sm leading-6 text-[var(--text-2)]">
      <template #next><strong>{{ t("common.actions.next") }}</strong></template>
    </i18n-t>
    <ol class="mt-3 space-y-1 text-sm text-[var(--text-2)]">
      <li v-for="step in HOW_TO" :key="step">{{ t(`settings.wizard.excel.howTo.${step}`) }}</li>
    </ol>
    <div class="mt-4 flex flex-wrap gap-2">
      <PrimeButton
        :label="t('settings.wizard.excel.download')"
        icon="pi pi-download"
        severity="secondary"
        class="min-h-11"
        :loading="downloading"
        @click="emit('download')"
      />
      <PrimeButton
        :label="t('settings.wizard.excel.upload')"
        icon="pi pi-upload"
        severity="secondary"
        class="min-h-11"
        :loading="checking"
        @click="emit('upload')"
      />
    </div>

    <div
      v-if="pending"
      ref="importConfirm"
      class="mt-4 rounded-xl border border-[var(--border-soft)] bg-[var(--warning-soft)] p-4 text-sm text-[var(--text-1)]"
    >
      <p class="font-semibold">{{ t("settings.wizard.excel.fileOk", { file: pending.file.name }) }}</p>
      <p class="mt-1 leading-6 text-[var(--text-2)]">
        {{
          t("settings.wizard.excel.replaceText", {
            cycle: t("settings.rotation.cycle", { weeks: pending.check.config.cycle_length }),
            week: weekOfYearLabel(localeTag, pending.check.config.start_year, pending.check.config.start_week),
            assignments: t("settings.rotation.assignments", pending.check.importedAssignments),
            current: t("settings.rotation.assignments", assignmentCount),
          })
        }}
      </p>
      <div class="mt-3 flex flex-wrap gap-2">
        <PrimeButton
          :label="t('settings.wizard.excel.replace')"
          icon="pi pi-check"
          class="min-h-11"
          :loading="importing"
          @click="emit('confirm')"
        />
        <PrimeButton
          :label="t('common.actions.cancel')"
          severity="secondary"
          text
          class="min-h-11"
          @click="emit('cancel')"
        />
      </div>
    </div>

    <p
      v-if="error"
      class="mt-4 rounded-xl bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger-ink)]"
    >
      {{ error }}
    </p>
  </div>
</template>
