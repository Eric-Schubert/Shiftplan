import type { RotationExcelImportResult } from "~/types/rotation";

/**
 * Excel template download and import for the rotation pattern. A chosen file is checked first;
 * the pattern is only replaced after confirming.
 */
export function useRotationExcelImport(onImported: () => void) {
  const dataStore = useDataStore();
  const { authFetch } = useAuthFetch();

  const downloadingTemplate = ref(false);
  const checkingFile = ref(false);
  const importingExcel = ref(false);
  const excelError = ref<string | null>(null);
  const pendingImport = ref<{ file: File; check: RotationExcelImportResult } | null>(null);
  const importDone = ref<RotationExcelImportResult | null>(null);

  function resetExcelImport() {
    excelError.value = null;
    pendingImport.value = null;
    importDone.value = null;
  }

  async function downloadExcelTemplate() {
    downloadingTemplate.value = true;
    excelError.value = null;

    try {
      const response = await fetch("/api/rotation/excel-template", { credentials: "include" });
      if (!response.ok) {
        excelError.value = await readResponseError(response);
        return;
      }

      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = "schichtplan-rotation-template.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      excelError.value = error.message || "Vorlage konnte nicht geladen werden";
    } finally {
      downloadingTemplate.value = false;
    }
  }

  function uploadExcel(file: File, dryRun: boolean) {
    const formData = new FormData();
    formData.append("file", file);
    if (dryRun) formData.append("dryRun", "1");
    return authFetch<RotationExcelImportResult>("/api/rotation/excel-import", {
      method: "POST",
      body: formData,
    });
  }

  async function checkExcelFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;

    checkingFile.value = true;
    excelError.value = null;
    importDone.value = null;
    pendingImport.value = null;

    try {
      pendingImport.value = { file, check: await uploadExcel(file, true) };
    } catch (error: any) {
      excelError.value = error.data?.statusMessage || "Die Datei konnte nicht gelesen werden";
    } finally {
      checkingFile.value = false;
    }
  }

  async function confirmImport() {
    if (!pendingImport.value) return;

    importingExcel.value = true;
    excelError.value = null;

    try {
      const result = await uploadExcel(pendingImport.value.file, false);
      await dataStore.fetchRotation();
      importDone.value = result;
      onImported();
    } catch (error: any) {
      excelError.value = error.data?.statusMessage || "Import fehlgeschlagen, das Muster ist unverändert";
    } finally {
      importingExcel.value = false;
    }
  }

  return {
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
  };
}

async function readResponseError(response: Response): Promise<string> {
  try {
    const data = await response.json();
    return data.statusMessage || data.message || response.statusText;
  } catch {
    return response.statusText;
  }
}
