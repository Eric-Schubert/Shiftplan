<script setup lang="ts">
import type { RotationExcelImportResult } from "~/types/rotation";
import { getIsoWeekOfDate, getPatternWeekForCalendarWeek } from "~/utils/rotation";

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
const { authFetch } = useAuthFetch();

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
const importConfirm = ref<HTMLElement | null>(null);
const activeStep = ref(0);
const editingConfig = ref(false);
const downloadingTemplate = ref(false);
const checkingFile = ref(false);
const importingExcel = ref(false);
const excelError = ref<string | null>(null);
const pendingImport = ref<{ file: File; check: RotationExcelImportResult } | null>(null);
const importDone = ref<RotationExcelImportResult | null>(null);
const rolledOut = ref(false);

const rotationConfig = computed(() => dataStore.rotationConfig);
const patternWeeks = computed(() => dataStore.rotationPattern?.weeks ?? []);

const assignmentCount = computed(() =>
  patternWeeks.value.reduce(
    (total, week) => total + week.assignments.reduce((sum, assignment) => sum + assignment.staff.length, 0),
    0
  )
);

const currentPatternWeek = computed(() => {
  const config = rotationConfig.value;
  if (!config) return null;
  return getPatternWeekForCalendarWeek(
    config.cycle_length,
    config.start_year,
    config.start_week,
    today.year,
    today.week
  );
});

const understaffedCount = computed(() =>
  patternWeeks.value.reduce(
    (total, week) =>
      total + week.assignments.filter((assignment) => assignment.staff.length < assignment.shift.min_staff).length,
    0
  )
);

watch(
  () => props.visible,
  (isVisible) => {
    if (!isVisible) return;
    activeStep.value = props.startStep ?? 0;
    editingConfig.value = false;
    excelError.value = null;
    pendingImport.value = null;
    importDone.value = null;
    rolledOut.value = false;
    dataStore.fetchRotation();
  }
);

watch(activeStep, () => {
  pendingImport.value = null;
  editingConfig.value = false;
});

function assignmentsLabel(count: number): string {
  return count === 1 ? "1 Zuweisung" : `${count} Zuweisungen`;
}

function staffingNote(staffCount: number, minStaff: number): string | null {
  if (staffCount === 0) return "unbesetzt";
  if (staffCount < minStaff) return `${staffCount} von ${minStaff}`;
  return null;
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

/** Checks the chosen file first; the pattern is only replaced after confirming. */
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
    await nextTick();
    importConfirm.value?.scrollIntoView({ behavior: "smooth", block: "nearest" });
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
    activeStep.value = 1;
  } catch (error: any) {
    excelError.value = error.data?.statusMessage || "Import fehlgeschlagen, das Muster ist unverändert";
  } finally {
    importingExcel.value = false;
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

      <ol class="grid grid-cols-3 gap-2">
        <li v-for="(step, index) in steps" :key="step.title">
          <button
            type="button"
            class="h-full w-full rounded-xl border px-3 py-2.5 text-left transition"
            :class="
              activeStep === index
                ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]'
                : 'border-[var(--border-soft)] bg-[var(--surface-muted)] text-[var(--text-2)] hover:border-[var(--border-strong)]'
            "
            :aria-current="activeStep === index ? 'step' : undefined"
            @click="activeStep = index"
          >
            <span class="flex items-center gap-2 text-sm font-semibold">
              <i v-if="index < activeStep" class="pi pi-check text-xs" aria-hidden="true"></i>
              <span v-else class="planner-kicker !text-inherit">{{ index + 1 }}</span>
              {{ step.title }}
            </span>
            <span class="mt-0.5 hidden text-xs leading-5 sm:block">{{ step.text }}</span>
          </button>
        </li>
      </ol>

      <section v-if="activeStep === 0" class="space-y-4">
        <div class="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-4">
          <p class="planner-kicker">Aktuelles Muster</p>
          <div v-if="rotationConfig" class="mt-2 flex flex-wrap items-center gap-2">
            <span class="planner-chip planner-chip--accent">{{ rotationConfig.cycle_length }}-Wochen-Zyklus</span>
            <span class="planner-chip">
              Musterwoche 1 = KW {{ rotationConfig.start_week }}/{{ rotationConfig.start_year }}
            </span>
            <span class="planner-chip">{{ assignmentsLabel(assignmentCount) }}</span>
          </div>
          <p v-if="currentPatternWeek" class="mt-3 text-sm text-[var(--text-2)]">
            Diese Woche (KW {{ today.week }}/{{ today.year }}) ist Musterwoche {{ currentPatternWeek }}.
            <button
              v-if="!editingConfig"
              type="button"
              class="ml-1 font-medium text-[var(--accent-strong)] underline-offset-2 hover:underline"
              @click="editingConfig = true"
            >
              Startpunkt ändern
            </button>
          </p>

          <div v-if="editingConfig" class="mt-4 border-t border-[var(--border-soft)] pt-4">
            <RotationConfigForm @saved="editingConfig = false" @cancel="editingConfig = false" />
          </div>
        </div>

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
              :loading="downloadingTemplate"
              @click="downloadExcelTemplate"
            />
            <PrimeButton
              label="Ausgefüllte Datei hochladen"
              icon="pi pi-upload"
              severity="secondary"
              class="min-h-11"
              :loading="checkingFile"
              @click="excelFileInput?.click()"
            />
          </div>

          <div
            v-if="pendingImport"
            ref="importConfirm"
            class="mt-4 rounded-xl border border-[var(--border-soft)] bg-[var(--warning-soft)] p-4 text-sm text-[var(--text-1)]"
          >
            <p class="font-semibold">„{{ pendingImport.file.name }}“ ist in Ordnung.</p>
            <p class="mt-1 leading-6 text-[var(--text-2)]">
              Neues Muster: {{ pendingImport.check.config.cycle_length }}-Wochen-Zyklus, Musterwoche 1 =
              KW {{ pendingImport.check.config.start_week }}/{{ pendingImport.check.config.start_year }},
              {{ assignmentsLabel(pendingImport.check.importedAssignments) }}.
              Es ersetzt das aktuelle Muster ({{ assignmentsLabel(assignmentCount) }}). Wochenpläne bleiben
              unverändert, bis du sie im letzten Schritt ausrollst.
            </p>
            <div class="mt-3 flex flex-wrap gap-2">
              <PrimeButton
                label="Muster ersetzen"
                icon="pi pi-check"
                class="min-h-11"
                :loading="importingExcel"
                @click="confirmImport"
              />
              <PrimeButton
                label="Abbrechen"
                severity="secondary"
                text
                class="min-h-11"
                @click="pendingImport = null"
              />
            </div>
          </div>

          <p
            v-if="excelError"
            class="mt-4 rounded-xl bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger-ink)]"
          >
            {{ excelError }}
          </p>
        </div>
      </section>

      <section v-else-if="activeStep === 1" class="space-y-4">
        <p
          v-if="importDone"
          class="rounded-xl bg-[var(--positive-soft)] px-4 py-3 text-sm text-[var(--positive-ink)]"
        >
          <i class="pi pi-check-circle mr-1" aria-hidden="true"></i>
          Muster übernommen: {{ assignmentsLabel(importDone.importedAssignments) }}.
        </p>

        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p
            class="text-sm"
            :class="understaffedCount > 0 ? 'text-[var(--warning-ink)]' : 'text-[var(--positive-ink)]'"
          >
            <template v-if="understaffedCount > 0">
              <i class="pi pi-exclamation-triangle mr-1" aria-hidden="true"></i>
              {{ understaffedCount }} {{ understaffedCount === 1 ? "Schicht ist" : "Schichten sind" }}
              im Muster unter der Mindestbesetzung.
            </template>
            <template v-else>
              <i class="pi pi-check-circle mr-1" aria-hidden="true"></i>
              Alle Schichten sind im Muster besetzt.
            </template>
          </p>
          <PrimeButton
            label="Im Board bearbeiten"
            icon="pi pi-pencil"
            severity="secondary"
            class="min-h-11 shrink-0"
            @click="emit('edit-board')"
          />
        </div>

        <div class="grid max-h-[50vh] gap-3 overflow-y-auto sm:grid-cols-2">
          <div
            v-for="week in patternWeeks"
            :key="week.pattern_week"
            class="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-3"
          >
            <p class="flex items-center gap-2 text-sm font-semibold text-[var(--text-1)]">
              Musterwoche {{ week.pattern_week }}
              <span v-if="week.pattern_week === currentPatternWeek" class="planner-chip planner-chip--accent">
                diese Woche
              </span>
            </p>
            <ul class="mt-2 space-y-1.5 text-sm">
              <li v-for="assignment in week.assignments" :key="assignment.shift.shift_id" class="flex gap-2">
                <span
                  class="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                  :style="{ backgroundColor: assignment.shift.color }"
                  aria-hidden="true"
                ></span>
                <span class="w-20 shrink-0 font-medium text-[var(--text-1)]">{{ assignment.shift.name }}</span>
                <span class="min-w-0 text-[var(--text-2)]">
                  {{ assignment.staff.map((staff) => staff.name).join(", ") }}
                  <span
                    v-if="staffingNote(assignment.staff.length, assignment.shift.min_staff)"
                    class="font-medium text-[var(--warning-ink)]"
                  >
                    {{ assignment.staff.length > 0 ? "·" : "" }}
                    {{ staffingNote(assignment.staff.length, assignment.shift.min_staff) }}
                  </span>
                </span>
              </li>
            </ul>
          </div>
        </div>
      </section>

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
      <div class="flex w-full items-center justify-between gap-2">
        <PrimeButton label="Schließen" text class="min-h-11" @click="dialogVisible = false" />
        <div class="flex gap-2">
          <PrimeButton
            v-if="activeStep > 0"
            label="Zurück"
            severity="secondary"
            text
            class="min-h-11"
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
          <PrimeButton
            v-else-if="rolledOut"
            label="Fertig"
            icon="pi pi-check"
            class="min-h-11"
            @click="dialogVisible = false"
          />
        </div>
      </div>
    </template>
  </PrimeDialog>
</template>
