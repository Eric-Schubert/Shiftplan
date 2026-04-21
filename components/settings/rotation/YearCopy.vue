<script setup lang="ts">
const { authFetch } = useAuthFetch();

interface YearCopyPreview {
  year: number;
  totalWeeks: number;
  totalAssignments: number;
  weeks: Array<{ week: number; assignments: number }>;
}

interface YearCopyResult {
  success: boolean;
  copiedWeeks: number;
  skippedWeeks: number;
  copiedAssignments: number;
}

const showDialog = ref(false);
const sourceYear = ref(new Date().getFullYear());
const targetYear = ref(new Date().getFullYear() + 1);
const overwrite = ref(false);
const copying = ref(false);
const loading = ref(false);

// Vorschau-Daten
const preview = ref<YearCopyPreview | null>(null);

// Ergebnis nach dem Kopieren
const result = ref<YearCopyResult | null>(null);

const error = ref<string | null>(null);

// Vorschau laden wenn sich das Quelljahr ändert
async function loadPreview() {
  loading.value = true;
  error.value = null;
  preview.value = null;
  result.value = null;

  try {
    preview.value = await $fetch<YearCopyPreview>("/api/shiftplan/year-summary", {
      query: { year: sourceYear.value },
    });
  } catch (e: any) {
    error.value = e.data?.statusMessage || "Fehler beim Laden der Vorschau";
  } finally {
    loading.value = false;
  }
}

// Dialog öffnen und Vorschau laden
function openDialog() {
  result.value = null;
  error.value = null;
  showDialog.value = true;
  loadPreview();
}

// Quelljahr ändern → Vorschau neu laden
watch(sourceYear, () => {
  if (showDialog.value) {
    loadPreview();
  }
});

// Kopieren ausführen
async function executeCopy() {
  copying.value = true;
  error.value = null;
  result.value = null;

  try {
    result.value = await authFetch<YearCopyResult>("/api/shiftplan/copy-year", {
      method: "POST",
      body: {
        sourceYear: sourceYear.value,
        targetYear: targetYear.value,
        overwrite: overwrite.value,
      },
    });
  } catch (e: any) {
    error.value = e.data?.statusMessage || "Fehler beim Kopieren";
  } finally {
    copying.value = false;
  }
}
</script>

<template>
  <div>
    <PrimeButton
      label="Jahr kopieren"
      icon="pi pi-copy"
      severity="secondary"
      size="small"
      @click="openDialog"
    />

    <PrimeDialog
      v-model:visible="showDialog"
      header="Schichtplan kopieren"
      modal
      :style="{ width: '30rem', maxWidth: 'calc(100vw - 1.5rem)' }"
    >
      <div class="space-y-4">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Kopiert alle Schichtzuweisungen von einem Jahr in ein anderes.
          Das Rotationsmuster bleibt unverändert.
        </p>

        <!-- Quell- und Zieljahr -->
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="flex flex-col gap-2">
            <label for="copy-source-year" class="text-sm font-medium">Von (Quelljahr)</label>
            <PrimeInputNumber
              v-model="sourceYear"
              input-id="copy-source-year"
              :min="2020"
              :max="2100"
              :use-grouping="false"
            />
          </div>
          <div class="flex flex-col gap-2">
            <label for="copy-target-year" class="text-sm font-medium">Nach (Zieljahr)</label>
            <PrimeInputNumber
              v-model="targetYear"
              input-id="copy-target-year"
              :min="2020"
              :max="2100"
              :use-grouping="false"
            />
          </div>
        </div>

        <!-- Vorschau -->
        <div v-if="loading" class="flex items-center gap-2 text-sm text-gray-500">
          <i class="pi pi-spin pi-spinner"></i>
          Lade Vorschau...
        </div>

        <div
          v-else-if="preview && preview.totalWeeks > 0"
          class="rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <div class="text-sm text-gray-700 dark:text-gray-300">
            <p class="font-medium mb-1">
              {{ preview.totalWeeks }} Wochen mit {{ preview.totalAssignments }} Zuweisungen in {{ sourceYear }}
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              KW {{ preview.weeks[0]?.week }} bis KW {{ preview.weeks[preview.weeks.length - 1]?.week }}
            </p>
          </div>
        </div>

        <div
          v-else-if="preview && preview.totalWeeks === 0"
          class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3"
        >
          <p class="text-sm text-yellow-700 dark:text-yellow-300">
            Keine Schichtpläne in {{ sourceYear }} vorhanden.
          </p>
        </div>

        <!-- Overwrite Option -->
        <div class="flex items-center gap-2">
          <PrimeCheckbox v-model="overwrite" :binary="true" input-id="overwrite" />
          <label for="overwrite" class="text-sm text-gray-700 dark:text-gray-300">
            Bestehende Zuweisungen in {{ targetYear }} überschreiben
          </label>
        </div>

        <div v-if="!overwrite" class="text-xs text-gray-500 dark:text-gray-400 -mt-2 ml-7">
          Wochen die in {{ targetYear }} bereits Zuweisungen haben werden übersprungen.
        </div>

        <div v-if="overwrite" class="text-xs text-orange-600 dark:text-orange-400 -mt-2 ml-7">
          ⚠ Bestehende Zuweisungen in {{ targetYear }} werden gelöscht und ersetzt!
        </div>

        <!-- Fehler -->
        <div
          v-if="error"
          class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3"
        >
          <p class="text-sm text-red-700 dark:text-red-300">{{ error }}</p>
        </div>

        <!-- Ergebnis -->
        <div
          v-if="result?.success"
          class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3"
        >
          <p class="text-sm font-medium text-green-700 dark:text-green-400 mb-1">
            ✓ Erfolgreich kopiert!
          </p>
          <div class="text-xs text-green-600 dark:text-green-300 space-y-0.5">
            <p>{{ result.copiedWeeks }} Wochen kopiert ({{ result.copiedAssignments }} Zuweisungen)</p>
            <p v-if="result.skippedWeeks > 0">
              {{ result.skippedWeeks }} Wochen übersprungen (bereits befüllt)
            </p>
          </div>
        </div>
      </div>

      <template #footer>
        <PrimeButton
          label="Schließen"
          text
          class="min-h-11"
          @click="showDialog = false"
        />
        <PrimeButton
          label="Kopieren"
          icon="pi pi-copy"
          class="min-h-11"
          :loading="copying"
          :disabled="!preview || preview.totalWeeks === 0 || sourceYear === targetYear"
          @click="executeCopy"
        />
      </template>
    </PrimeDialog>
  </div>
</template>
