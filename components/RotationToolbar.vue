<script setup lang="ts">
import type { RotationExcelImportResult } from "~/types/rotation";

const emit = defineEmits<{
  (e: "configure"): void;
  (e: "generate"): void;
}>();

const dataStore = useDataStore();
const { authFetch } = useAuthFetch();

const excelFileInput = ref<HTMLInputElement | null>(null);
const downloadingTemplate = ref(false);
const importingExcel = ref(false);
const excelImportError = ref<string | null>(null);
const excelImportResult = ref<RotationExcelImportResult | null>(null);

async function downloadExcelTemplate() {
  downloadingTemplate.value = true;
  excelImportError.value = null;

  try {
    const response = await fetch("/api/rotation/excel-template", {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(await readResponseError(response));
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "schichtplan-rotation-template.xlsx";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (error: any) {
    excelImportError.value = error.message || "Vorlage konnte nicht geladen werden";
  } finally {
    downloadingTemplate.value = false;
  }
}

function openExcelImport() {
  excelFileInput.value?.click();
}

async function importExcelTemplate(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  if (!file) return;

  importingExcel.value = true;
  excelImportError.value = null;
  excelImportResult.value = null;

  try {
    const formData = new FormData();
    formData.append("file", file);

    excelImportResult.value = await authFetch<RotationExcelImportResult>("/api/rotation/excel-import", {
      method: "POST",
      body: formData,
    });

    await dataStore.fetchRotation();
  } catch (error: any) {
    excelImportError.value =
      error.data?.statusMessage || error.data?.message || "Excel-Import fehlgeschlagen";
  } finally {
    importingExcel.value = false;
    input.value = "";
  }
}

async function readResponseError(response: Response): Promise<string> {
  try {
    const data = await response.json();
    return data.statusMessage || data.message || response.statusText;
  } catch {
    return response.statusText;
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div v-if="dataStore.rotationPattern">
        <p class="text-gray-600 dark:text-gray-400">
          <strong>{{ dataStore.rotationPattern.config.cycle_length }}-Wochen-Zyklus</strong>
          · Start: KW {{ dataStore.rotationPattern.config.start_week }}/{{ dataStore.rotationPattern.config.start_year }}
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <input
          ref="excelFileInput"
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          class="hidden"
          @change="importExcelTemplate"
        />

        <PrimeButton
          label="Excel-Vorlage"
          icon="pi pi-download"
          severity="secondary"
          class="min-h-11"
          :loading="downloadingTemplate"
          @click="downloadExcelTemplate"
        />

        <PrimeButton
          label="Excel importieren"
          icon="pi pi-upload"
          severity="secondary"
          class="min-h-11"
          :loading="importingExcel"
          @click="openExcelImport"
        />

        <PrimeButton
          label="Konfiguration"
          icon="pi pi-cog"
          severity="secondary"
          class="min-h-11"
          @click="emit('configure')"
        />

        <YearCopy />

        <PrimeButton
          label="Plan generieren"
          icon="pi pi-sparkles"
          class="min-h-11"
          @click="emit('generate')"
        />
      </div>
    </div>

    <div
      v-if="excelImportResult"
      class="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300"
    >
      Import abgeschlossen: {{ excelImportResult.importedRows }} Zeilen gelesen,
      {{ excelImportResult.importedAssignments }} Zuweisungen übernommen.
      Zyklus: {{ excelImportResult.config.cycle_length }} Wochen ab KW
      {{ excelImportResult.config.start_week }}/{{ excelImportResult.config.start_year }}.
    </div>

    <div
      v-if="excelImportError"
      class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
    >
      {{ excelImportError }}
    </div>
  </div>
</template>
