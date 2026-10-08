<script setup lang="ts">
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

const { assignmentCount, assignmentsLabel } = useRotationPatternSummary();
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
    <p class="font-semibold text-[var(--text-1)]">Muster per Excel übernehmen <span class="font-normal text-[var(--text-3)]">(optional)</span></p>
    <p class="mt-1 max-w-[65ch] text-sm leading-6 text-[var(--text-2)]">
      Nur nötig, wenn du das Muster lieber in Excel pflegst. Sonst einfach auf
      <strong>Weiter</strong>.
    </p>
    <ol class="mt-3 space-y-1 text-sm text-[var(--text-2)]">
      <li>1. Vorlage herunterladen, sie enthält das aktuelle Muster und alle Mitarbeitenden.</li>
      <li>2. In Excel ausfüllen und speichern.</li>
      <li>3. Hochladen. Du siehst vor dem Ersetzen, was übernommen wird.</li>
    </ol>
    <div class="mt-4 flex flex-wrap gap-2">
      <PrimeButton
        label="Vorlage herunterladen"
        icon="pi pi-download"
        severity="secondary"
        class="min-h-11"
        :loading="downloading"
        @click="emit('download')"
      />
      <PrimeButton
        label="Ausgefüllte Datei hochladen"
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
      <p class="font-semibold">„{{ pending.file.name }}“ ist in Ordnung.</p>
      <p class="mt-1 leading-6 text-[var(--text-2)]">
        Neues Muster: {{ pending.check.config.cycle_length }}-Wochen-Zyklus, Musterwoche 1 =
        KW {{ pending.check.config.start_week }}/{{ pending.check.config.start_year }},
        {{ assignmentsLabel(pending.check.importedAssignments) }}.
        Es ersetzt das aktuelle Muster ({{ assignmentsLabel(assignmentCount) }}). Wochenpläne bleiben
        unverändert, bis du sie im letzten Schritt ausrollst.
      </p>
      <div class="mt-3 flex flex-wrap gap-2">
        <PrimeButton
          label="Muster ersetzen"
          icon="pi pi-check"
          class="min-h-11"
          :loading="importing"
          @click="emit('confirm')"
        />
        <PrimeButton
          label="Abbrechen"
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
