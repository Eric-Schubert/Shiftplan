<script setup lang="ts">
import type {
  RotationExcelImportResult,
  RotationGeneratePreviewItem,
  RotationGenerateResult,
} from "~/types/rotation";
import { getIsoWeeksInYear, getPatternWeekForCalendarWeek } from "~/utils/rotation";

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: "update:visible", value: boolean): void;
}>();

const dataStore = useDataStore();
const { authFetch } = useAuthFetch();

const steps = [
  {
    title: "Muster",
    eyebrow: "1",
    text: "Importieren oder Startpunkt festlegen",
  },
  {
    title: "Pruefen",
    eyebrow: "2",
    text: "Besetzung je Musterwoche kontrollieren",
  },
  {
    title: "Ausrollen",
    eyebrow: "3",
    text: "Wochenplaene erzeugen",
  },
];

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit("update:visible", value),
});

const excelFileInput = ref<HTMLInputElement | null>(null);
const activeStep = ref(0);
const downloadingTemplate = ref(false);
const importingExcel = ref(false);
const generating = ref(false);
const showConfigDialog = ref(false);
const showYearCopyDialog = ref(false);
const excelImportError = ref<string | null>(null);
const excelImportResult = ref<RotationExcelImportResult | null>(null);
const generateResult = ref<RotationGenerateResult | null>(null);
const rolloutYear = ref(new Date().getFullYear());
const rolloutWeek = ref(1);
const rolloutWeeks = ref(4);
const rolloutFullYear = ref(true);

const rotationConfig = computed(() => dataStore.rotationConfig);

const assignmentCount = computed(() => {
  return (
    dataStore.rotationPattern?.weeks.reduce((total, week) => {
      return (
        total +
        week.assignments.reduce((weekTotal, assignment) => weekTotal + assignment.staff.length, 0)
      );
    }, 0) || 0
  );
});

const emptyShiftCount = computed(() => {
  return (
    dataStore.rotationPattern?.weeks.reduce((total, week) => {
      return total + week.assignments.filter((assignment) => assignment.staff.length === 0).length;
    }, 0) || 0
  );
});

const rolloutYearMaxWeeks = computed(() => getIsoWeeksInYear(rolloutYear.value));

const weeksToGenerate = computed(() => {
  if (!rolloutFullYear.value) return rolloutWeeks.value;
  return Math.max(1, rolloutYearMaxWeeks.value - rolloutWeek.value + 1);
});

const generatePreviewList = computed<RotationGeneratePreviewItem[]>(() => {
  const config = rotationConfig.value;
  if (!config) return [];

  const preview: RotationGeneratePreviewItem[] = [];
  let year = rolloutYear.value;
  let week = rolloutWeek.value;

  for (let index = 0; index < weeksToGenerate.value; index += 1) {
    preview.push({
      year,
      week,
      patternWeek: getPatternWeekForCalendarWeek(
        config.cycle_length,
        config.start_year,
        config.start_week,
        year,
        week
      ),
    });

    week += 1;
    if (week > getIsoWeeksInYear(year)) {
      week = 1;
      year += 1;
    }
  }

  return preview;
});

watch(
  () => props.visible,
  (isVisible) => {
    if (isVisible) {
      activeStep.value = 0;
      resetTransientState();
      initializeRolloutFromConfig();
      return;
    }

    resetTransientState();
  }
);

watch(
  rolloutYear,
  () => {
    if (rolloutWeek.value > rolloutYearMaxWeeks.value) {
      rolloutWeek.value = rolloutYearMaxWeeks.value;
    }
  }
);

function initializeRolloutFromConfig() {
  const config = rotationConfig.value;
  if (!config) return;

  rolloutYear.value = config.start_year;
  rolloutWeek.value = Math.min(config.start_week, getIsoWeeksInYear(config.start_year));
  rolloutFullYear.value = true;
}

function resetTransientState() {
  excelImportError.value = null;
  excelImportResult.value = null;
  generateResult.value = null;
}

function openExcelImport() {
  excelFileInput.value?.click();
}

function handleConfigDialogVisible(value: boolean) {
  showConfigDialog.value = value;
  if (!value) {
    initializeRolloutFromConfig();
  }
}

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
    initializeRolloutFromConfig();
    activeStep.value = 1;
  } catch (error: any) {
    excelImportError.value =
      error.data?.statusMessage || error.data?.message || "Excel-Import fehlgeschlagen";
  } finally {
    importingExcel.value = false;
    input.value = "";
  }
}

async function generateRollout() {
  generating.value = true;
  generateResult.value = null;

  try {
    generateResult.value = await authFetch<RotationGenerateResult>("/api/shiftplan/generate", {
      method: "POST",
      body: {
        year: rolloutYear.value,
        week: rolloutWeek.value,
        weeks: weeksToGenerate.value,
      },
    });
  } finally {
    generating.value = false;
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
  <PrimeDialog
    v-model:visible="dialogVisible"
    header="Rotations-Assistent"
    modal
    :style="{ width: '56rem', maxWidth: 'calc(100vw - 1.5rem)' }"
  >
    <div class="space-y-5">
      <input
        ref="excelFileInput"
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        class="hidden"
        @change="importExcelTemplate"
      />

      <div class="grid gap-3 md:grid-cols-3">
        <button
          v-for="(step, index) in steps"
          :key="step.title"
          type="button"
          class="rounded-[20px] border px-4 py-3 text-left transition"
          :class="
            activeStep === index
              ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]'
              : 'border-[var(--border-soft)] bg-[var(--surface-muted)] text-[var(--text-2)] hover:border-[var(--border-strong)]'
          "
          @click="activeStep = index"
        >
          <span class="planner-kicker">{{ step.eyebrow }}</span>
          <span class="mt-1 block text-base font-semibold">{{ step.title }}</span>
          <span class="mt-1 block text-xs leading-5">{{ step.text }}</span>
        </button>
      </div>

      <section v-if="activeStep === 0" class="space-y-4">
        <div class="rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface-muted)] p-4">
          <p class="planner-kicker">Aktuelles Muster</p>
          <div class="mt-2 flex flex-wrap items-center gap-2">
            <span v-if="rotationConfig" class="planner-chip planner-chip--accent">
              {{ rotationConfig.cycle_length }} Wochen ab KW
              {{ rotationConfig.start_week }}/{{ rotationConfig.start_year }}
            </span>
            <span class="planner-chip planner-chip--muted">
              {{ assignmentCount }} Zuweisungen im Muster
            </span>
          </div>
          <p class="mt-3 max-w-[65ch] text-sm leading-6 text-[var(--text-2)]">
            Lade eine Excel-Vorlage herunter, importiere ein fertiges Muster oder passe den
            Startpunkt direkt in der App an. Nach einem Import bleiben bestehende Wochenplaene
            unveraendert, bis du sie im letzten Schritt ausrollst.
          </p>
        </div>

        <div class="grid gap-3 md:grid-cols-3">
          <div class="rounded-[22px] border border-[var(--border-soft)] bg-[var(--surface)] p-4">
            <p class="font-semibold text-[var(--text-1)]">Vorlage holen</p>
            <p class="mt-2 min-h-12 text-sm leading-6 text-[var(--text-2)]">
              Excel-Datei mit allen aktiven Mitarbeitenden und Schichten herunterladen.
            </p>
            <PrimeButton
              label="Excel-Vorlage"
              icon="pi pi-download"
              severity="secondary"
              class="mt-4 min-h-11 w-full"
              :loading="downloadingTemplate"
              @click="downloadExcelTemplate"
            />
          </div>

          <div class="rounded-[22px] border border-[var(--border-soft)] bg-[var(--surface)] p-4">
            <p class="font-semibold text-[var(--text-1)]">Muster importieren</p>
            <p class="mt-2 min-h-12 text-sm leading-6 text-[var(--text-2)]">
              Fertige Vorlage einlesen und das Rotationsmuster ersetzen.
            </p>
            <PrimeButton
              label="Excel importieren"
              icon="pi pi-upload"
              severity="secondary"
              class="mt-4 min-h-11 w-full"
              :loading="importingExcel"
              @click="openExcelImport"
            />
          </div>

          <div class="rounded-[22px] border border-[var(--border-soft)] bg-[var(--surface)] p-4">
            <p class="font-semibold text-[var(--text-1)]">Startpunkt setzen</p>
            <p class="mt-2 min-h-12 text-sm leading-6 text-[var(--text-2)]">
              Zykluslaenge, Startjahr und Startwoche feinjustieren.
            </p>
            <PrimeButton
              label="Konfiguration"
              icon="pi pi-cog"
              severity="secondary"
              class="mt-4 min-h-11 w-full"
              @click="showConfigDialog = true"
            />
          </div>
        </div>

        <div
          v-if="excelImportResult"
          class="rounded-[20px] border border-[var(--border-soft)] bg-[var(--positive-soft)] px-4 py-3 text-sm text-[var(--positive-ink)]"
        >
          Import abgeschlossen: {{ excelImportResult.importedRows }} Zeilen gelesen,
          {{ excelImportResult.importedAssignments }} Zuweisungen uebernommen.
        </div>

        <div
          v-if="excelImportError"
          class="rounded-[20px] border border-[var(--border-soft)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger-ink)]"
        >
          {{ excelImportError }}
        </div>
      </section>

      <section v-else-if="activeStep === 1" class="space-y-4">
        <div class="rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface-muted)] p-4">
          <p class="planner-kicker">Pruefschritt</p>
          <h3 class="mt-2 text-lg font-semibold text-[var(--text-1)]">
            Kontrolliere das Muster unten im Board
          </h3>
          <p class="mt-2 max-w-[65ch] text-sm leading-6 text-[var(--text-2)]">
            Der Assistent laesst das Muster sichtbar auf der Seite. Wenn du hier weitergehst,
            wird noch nichts veraendert. Erst im naechsten Schritt werden Wochenplaene erzeugt.
          </p>
        </div>

        <div class="grid gap-3 sm:grid-cols-3">
          <div class="rounded-[20px] border border-[var(--border-soft)] bg-[var(--surface)] p-4">
            <p class="planner-kicker">Zyklus</p>
            <p class="mt-2 text-2xl font-semibold text-[var(--text-1)]">
              {{ rotationConfig?.cycle_length || 0 }}
            </p>
            <p class="text-sm text-[var(--text-2)]">Musterwochen</p>
          </div>
          <div class="rounded-[20px] border border-[var(--border-soft)] bg-[var(--surface)] p-4">
            <p class="planner-kicker">Start</p>
            <p class="mt-2 text-2xl font-semibold text-[var(--text-1)]">
              KW {{ rotationConfig?.start_week || "-" }}
            </p>
            <p class="text-sm text-[var(--text-2)]">{{ rotationConfig?.start_year || "" }}</p>
          </div>
          <div class="rounded-[20px] border border-[var(--border-soft)] bg-[var(--surface)] p-4">
            <p class="planner-kicker">Offene Schichten</p>
            <p class="mt-2 text-2xl font-semibold text-[var(--text-1)]">
              {{ emptyShiftCount }}
            </p>
            <p class="text-sm text-[var(--text-2)]">ohne Person im Muster</p>
          </div>
        </div>

        <div class="rounded-[20px] border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3 text-sm leading-6 text-[var(--text-2)]">
          Tipp: Wenn die Musterkarten unten passen, gehe auf <strong>Weiter</strong>.
          Falls noch Namen fehlen, kannst du sie direkt im Board per Drag & Drop ergaenzen.
        </div>
      </section>

      <section v-else class="space-y-4">
        <div class="rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface-muted)] p-4">
          <p class="planner-kicker">Ausrollen</p>
          <h3 class="mt-2 text-lg font-semibold text-[var(--text-1)]">
            Wochenplaene aus dem aktuellen Muster erzeugen
          </h3>
          <p class="mt-2 max-w-[65ch] text-sm leading-6 text-[var(--text-2)]">
            Die ausgewaehlten Wochen werden mit dem aktuellen Rotationsmuster neu befuellt.
            Vorhandene Zuweisungen in diesen Wochen werden ersetzt.
          </p>
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="flex flex-col gap-2">
            <label for="wizard-rollout-year" class="font-medium">Startjahr</label>
            <PrimeInputNumber
              v-model="rolloutYear"
              input-id="wizard-rollout-year"
              :min="2020"
              :max="2100"
              :use-grouping="false"
            />
          </div>

          <div class="flex flex-col gap-2">
            <label for="wizard-rollout-week" class="font-medium">Startwoche</label>
            <PrimeInputNumber
              v-model="rolloutWeek"
              input-id="wizard-rollout-week"
              :min="1"
              :max="rolloutYearMaxWeeks"
              show-buttons
            />
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <label for="wizard-rollout-weeks" class="font-medium">Anzahl Wochen</label>
          <PrimeInputNumber
            v-if="!rolloutFullYear"
            v-model="rolloutWeeks"
            input-id="wizard-rollout-weeks"
            :min="1"
            :max="53"
            show-buttons
          />
          <div
            v-else
            class="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] px-3 py-2 text-sm font-medium text-[var(--text-1)]"
          >
            {{ weeksToGenerate }} Wochen automatisch
          </div>
        </div>

        <label
          for="wizard-full-year"
          class="flex cursor-pointer items-start gap-3 rounded-[20px] border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-2)]"
        >
          <PrimeCheckbox
            v-model="rolloutFullYear"
            input-id="wizard-full-year"
            binary
            class="mt-0.5"
          />
          <span>
            <span class="block font-semibold text-[var(--text-1)]">Bis Jahresende ausrollen</span>
            <span class="block leading-5">
              Generiert KW {{ rolloutWeek }}/{{ rolloutYear }} bis KW
              {{ rolloutYearMaxWeeks }}/{{ rolloutYear }} ({{ weeksToGenerate }} Wochen).
            </span>
          </span>
        </label>

        <div class="overflow-hidden rounded-[20px] border border-[var(--border-soft)]">
          <div class="bg-[var(--surface-muted)] px-4 py-2 text-sm font-medium text-[var(--text-1)]">
            Vorschau: Diese Wochen werden erzeugt
          </div>
          <div class="max-h-52 space-y-1 overflow-y-auto p-4 text-sm">
            <div
              v-for="preview in generatePreviewList"
              :key="`${preview.year}-${preview.week}`"
              class="flex justify-between rounded-lg px-2 py-1 text-[var(--text-2)]"
            >
              <span>KW {{ preview.week }}/{{ preview.year }}</span>
              <span>Muster {{ preview.patternWeek }}</span>
            </div>
          </div>
        </div>

        <div
          v-if="generateResult"
          class="rounded-[20px] border border-[var(--border-soft)] bg-[var(--positive-soft)] px-4 py-3 text-sm text-[var(--positive-ink)]"
        >
          {{ generateResult.generated }} Wochen erfolgreich ausgerollt.
        </div>

        <div class="flex flex-wrap gap-2">
          <PrimeButton
            label="Ausrollen"
            icon="pi pi-sync"
            class="min-h-11"
            :loading="generating"
            @click="generateRollout"
          />
          <PrimeButton
            label="Jahr kopieren"
            icon="pi pi-copy"
            severity="secondary"
            class="min-h-11"
            @click="showYearCopyDialog = true"
          />
        </div>
      </section>
    </div>

    <template #footer>
      <div class="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <PrimeButton
          label="Schliessen"
          text
          class="min-h-11"
          @click="dialogVisible = false"
        />
        <div class="flex justify-end gap-2">
          <PrimeButton
            label="Zurueck"
            severity="secondary"
            text
            class="min-h-11"
            :disabled="activeStep === 0"
            @click="activeStep -= 1"
          />
          <PrimeButton
            v-if="activeStep < steps.length - 1"
            label="Weiter"
            icon="pi pi-arrow-right"
            icon-pos="right"
            class="min-h-11"
            @click="activeStep += 1"
          />
        </div>
      </div>
    </template>
  </PrimeDialog>

  <RotationConfigDialog
    :visible="showConfigDialog"
    @update:visible="handleConfigDialogVisible"
  />

  <YearCopyDialog
    :visible="showYearCopyDialog"
    @update:visible="showYearCopyDialog = $event"
  />
</template>
