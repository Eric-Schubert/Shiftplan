<script setup lang="ts">
import type { RotationConfig } from "~/types/rotation";

const dataStore = useDataStore();
const { authFetch } = useAuthFetch();

// ============================================
// KONFIGURATION
// ============================================
const showConfigDialog = ref(false);
const configForm = ref<Partial<RotationConfig>>({});
const savingConfig = ref(false);

function openConfigDialog() {
  if (dataStore.rotationConfig) {
    configForm.value = {
      cycle_length: dataStore.rotationConfig.cycle_length,
      start_year: dataStore.rotationConfig.start_year,
      start_week: dataStore.rotationConfig.start_week,
    };
  }
  showConfigDialog.value = true;
}

const configPreview = computed(() => {
  const cycleLength = configForm.value.cycle_length || 4;
  const startYear = configForm.value.start_year || 2026;
  const startWeek = configForm.value.start_week || 1;

  const preview: Array<{ year: number; week: number; patternWeek: number; isStart: boolean }> = [];

  let year = startYear;
  let week = startWeek - 2;

  while (week < 1) {
    week += 52;
    year--;
  }

  for (let i = 0; i < 8; i++) {
    const startTotal = startYear * 52 + startWeek;
    const currentTotal = year * 52 + week;
    const weeksFromStart = currentTotal - startTotal;
    const patternIndex = ((weeksFromStart % cycleLength) + cycleLength) % cycleLength;
    const patternWeek = patternIndex + 1;
    const isStart = year === startYear && week === startWeek;

    preview.push({ year, week, patternWeek, isStart });

    week++;
    if (week > 52) {
      week = 1;
      year++;
    }
  }

  return preview;
});

async function saveConfig() {
  savingConfig.value = true;
  try {
    await dataStore.updateRotationConfig(configForm.value);
    showConfigDialog.value = false;
  } finally {
    savingConfig.value = false;
  }
}

// ============================================
// MITARBEITER ZUWEISEN (Dialog als Fallback)
// ============================================
const showAssignDialog = ref(false);
const assignContext = ref<{ patternWeek: number; shiftId: number; shiftName: string } | null>(null);
const assigning = ref(false);

function openAssignDialog(patternWeek: number, shiftId: number, shiftName: string) {
  assignContext.value = { patternWeek, shiftId, shiftName };
  showAssignDialog.value = true;
}

const availableStaffForAssign = computed(() => {
  if (!assignContext.value || !dataStore.rotationPattern) return [];

  const weekData = dataStore.rotationPattern.weeks.find(
    (w) => w.pattern_week === assignContext.value!.patternWeek
  );
  if (!weekData) return dataStore.activeStaff;

  const shiftAssignment = weekData.assignments.find(
    (a) => a.shift.shift_id === assignContext.value!.shiftId
  );
  if (!shiftAssignment) return dataStore.activeStaff;

  const assignedIds = shiftAssignment.staff.map((s) => s.staff_id);
  return dataStore.activeStaff.filter((s) => !assignedIds.includes(s.staff_id));
});

async function assignStaff(staffId: number) {
  if (!assignContext.value) return;

  assigning.value = true;
  try {
    await dataStore.assignToRotation(
      assignContext.value.patternWeek,
      staffId,
      assignContext.value.shiftId
    );
    showAssignDialog.value = false;
  } finally {
    assigning.value = false;
  }
}

async function unassignStaff(patternWeek: number, staffId: number, shiftId: number) {
  await dataStore.unassignFromRotation(patternWeek, staffId, shiftId);
}

// ============================================
// DRAG & DROP
// ============================================
const dragOverTarget = ref<string | null>(null);

function onPoolDragStart(event: DragEvent, staff: { staff_id: number; name: string }) {
  if (!event.dataTransfer) return;
  event.dataTransfer.effectAllowed = "copy";
  event.dataTransfer.setData(
    "application/json",
    JSON.stringify({
      staffId: staff.staff_id,
      staffName: staff.name,
      source: "pool",
    })
  );
}

function onChipDragStart(
  event: DragEvent,
  patternWeek: number,
  staffId: number,
  staffName: string,
  shiftId: number
) {
  if (!event.dataTransfer) return;
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData(
    "application/json",
    JSON.stringify({
      staffId,
      staffName,
      source: "rotation",
      sourceShiftId: shiftId,
      sourcePatternWeek: patternWeek,
    })
  );
}

function onDragOver(event: DragEvent, patternWeek: number, shiftId: number) {
  event.preventDefault();
  dragOverTarget.value = `${patternWeek}-${shiftId}`;
}

function onDragLeave(event: DragEvent, patternWeek: number, shiftId: number) {
  const relatedTarget = event.relatedTarget as HTMLElement | null;
  const currentTarget = event.currentTarget as HTMLElement;
  if (!relatedTarget || !currentTarget.contains(relatedTarget)) {
    if (dragOverTarget.value === `${patternWeek}-${shiftId}`) {
      dragOverTarget.value = null;
    }
  }
}

async function onDrop(event: DragEvent, patternWeek: number, shiftId: number) {
  event.preventDefault();
  dragOverTarget.value = null;

  const raw = event.dataTransfer?.getData("application/json");
  if (!raw) return;

  try {
    const data = JSON.parse(raw);
    const staffId = data.staffId;

    // Von anderer Schicht in gleicher Woche → verschieben
    if (data.source === "rotation" && data.sourceShiftId !== shiftId && data.sourcePatternWeek === patternWeek) {
      await dataStore.unassignFromRotation(patternWeek, staffId, data.sourceShiftId);
    }
    // Von anderer Musterwoche → aus alter entfernen
    else if (data.source === "rotation" && data.sourcePatternWeek !== patternWeek) {
      await dataStore.unassignFromRotation(data.sourcePatternWeek, staffId, data.sourceShiftId);
    }

    await dataStore.assignToRotation(patternWeek, staffId, shiftId);
  } catch (e) {
    console.error("Drop fehlgeschlagen:", e);
  }
}

function isDragTarget(patternWeek: number, shiftId: number): boolean {
  return dragOverTarget.value === `${patternWeek}-${shiftId}`;
}

// ============================================
// PLAN GENERIEREN
// ============================================
const showPreviewDialog = ref(false);
const previewYear = ref(new Date().getFullYear());

function getCurrentWeek(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const oneWeek = 604800000;
  return Math.ceil((diff / oneWeek) + start.getDay() / 7);
}

const previewWeek = ref(Math.min(Math.max(getCurrentWeek(), 1), 52));
const previewWeeks = ref(4);
const generating = ref(false);
const generateResult = ref<{
  generated: number;
  weeks: Array<{ year: number; week: number; pattern_week: number }>;
} | null>(null);

const generatePreviewList = computed(() => {
  if (!dataStore.rotationConfig) return [];

  const config = dataStore.rotationConfig;
  const preview: Array<{ year: number; week: number; patternWeek: number }> = [];

  let year = previewYear.value;
  let week = previewWeek.value;

  for (let i = 0; i < previewWeeks.value; i++) {
    const startTotal = config.start_year * 52 + config.start_week;
    const currentTotal = year * 52 + week;
    const weeksFromStart = currentTotal - startTotal;
    const patternIndex = ((weeksFromStart % config.cycle_length) + config.cycle_length) % config.cycle_length;
    const patternWeek = patternIndex + 1;

    preview.push({ year, week, patternWeek });

    week++;
    if (week > 52) {
      week = 1;
      year++;
    }
  }

  return preview;
});

async function generatePreview() {
  generating.value = true;
  try {
    generateResult.value = await authFetch("/api/shiftplan/generate", {
      method: "POST",
      body: {
        year: previewYear.value,
        week: previewWeek.value,
        weeks: previewWeeks.value,
      },
    });
  } finally {
    generating.value = false;
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header mit Konfiguration -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div v-if="dataStore.rotationPattern">
        <p class="text-gray-600 dark:text-gray-400">
          <strong>{{ dataStore.rotationPattern.config.cycle_length }}-Wochen-Zyklus</strong>
          · Start: KW {{ dataStore.rotationPattern.config.start_week }}/{{ dataStore.rotationPattern.config.start_year }}
        </p>
      </div>
      <div class="flex gap-2">
        <PrimeButton
          label="Konfiguration"
          icon="pi pi-cog"
          severity="secondary"
          size="small"
          @click="openConfigDialog"
        />
        <YearCopy />
        <PrimeButton
          label="Plan generieren"
          icon="pi pi-sparkles"
          size="small"
          @click="showPreviewDialog = true"
        />
      </div>
    </div>

    <!-- Info Box -->
    <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
      <div class="flex items-start gap-3">
        <Icon name="mdi:information" class="text-xl text-blue-500 mt-0.5" />
        <div class="text-sm text-blue-700 dark:text-blue-300">
          <p class="font-medium mb-1">So funktioniert das Rotationsmuster:</p>
          <p class="mb-2">
            Lege fest, wer in welcher Woche des Zyklus welche Schicht arbeitet.
            Das Muster wiederholt sich alle <strong>{{ dataStore.rotationPattern?.config.cycle_length || 4 }} Wochen</strong>.
          </p>
          <p class="text-xs opacity-80">
            <Icon name="mdi:calendar" class="mr-1" />
            Musterwoche 1 beginnt in KW {{ dataStore.rotationPattern?.config.start_week }}/{{ dataStore.rotationPattern?.config.start_year }}
          </p>
        </div>
      </div>
    </div>

    <!-- Mitarbeiter-Pool -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-3">
      <h4 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
        Mitarbeiter-Pool – per Drag & Drop in Schichten ziehen
      </h4>
      <div class="flex flex-wrap gap-1.5">
        <span
          v-for="staff in dataStore.activeStaff"
          :key="staff.staff_id"
          class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium cursor-grab active:cursor-grabbing transition-all hover:shadow-md select-none bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/60"
          draggable="true"
          @dragstart="onPoolDragStart($event, staff)"
        >
          {{ staff.name }}
          <span v-if="staff.is_parttime" class="text-[10px] opacity-60">TZ</span>
        </span>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="dataStore.loadingRotation" class="flex justify-center py-8">
      <PrimeProgressSpinner />
    </div>

    <!-- Rotationsmuster Grid -->
    <div v-else-if="dataStore.rotationPattern" class="space-y-4">
      <div
        v-for="weekData in dataStore.rotationPattern.weeks"
        :key="weekData.pattern_week"
        class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 overflow-hidden"
      >
        <!-- Wochenheader -->
        <div class="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b dark:border-gray-700">
          <h3 class="font-semibold text-gray-900 dark:text-white">
            Musterwoche {{ weekData.pattern_week }}
          </h3>
        </div>

        <!-- Schichten -->
        <div class="divide-y dark:divide-gray-700">
          <div
            v-for="assignment in weekData.assignments"
            :key="assignment.shift.shift_id"
            class="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 transition-colors duration-150"
            :class="{
              'bg-blue-50/70 dark:bg-blue-900/20': isDragTarget(weekData.pattern_week, assignment.shift.shift_id),
            }"
            @dragover="onDragOver($event, weekData.pattern_week, assignment.shift.shift_id)"
            @dragleave="onDragLeave($event, weekData.pattern_week, assignment.shift.shift_id)"
            @drop="onDrop($event, weekData.pattern_week, assignment.shift.shift_id)"
          >
            <!-- Schicht Info -->
            <div class="flex items-center gap-2 min-w-[150px]">
              <div
                class="w-3 h-3 rounded-full"
                :style="{ backgroundColor: assignment.shift.color }"
              />
              <span class="font-medium text-gray-700 dark:text-gray-300">
                {{ assignment.shift.name }}
              </span>
              <span class="text-sm text-gray-500">
                ({{ assignment.shift.start_time }} - {{ assignment.shift.end_time }})
              </span>
            </div>

            <!-- Zugewiesene Mitarbeiter -->
            <div class="flex-1 flex flex-wrap items-center gap-2">
              <span
                v-for="staff in assignment.staff"
                :key="staff.staff_id"
                class="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm text-gray-700 dark:text-gray-300 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow select-none"
                draggable="true"
                @dragstart="onChipDragStart($event, weekData.pattern_week, staff.staff_id, staff.name, assignment.shift.shift_id)"
              >
                {{ staff.name }}
                <button
                  class="ml-0.5 text-gray-400 hover:text-red-500 text-xs"
                  @click="unassignStaff(weekData.pattern_week, staff.staff_id, assignment.shift.shift_id)"
                >
                  ✕
                </button>
              </span>

              <!-- Drop-Hinweis -->
              <span
                v-if="isDragTarget(weekData.pattern_week, assignment.shift.shift_id) && assignment.staff.length === 0"
                class="text-xs text-blue-500 dark:text-blue-400 italic"
              >
                Hier ablegen
              </span>

              <PrimeButton
                icon="pi pi-plus"
                text
                rounded
                size="small"
                @click="openAssignDialog(weekData.pattern_week, assignment.shift.shift_id, assignment.shift.name)"
                v-tooltip="'Mitarbeiter hinzufügen'"
              />
            </div>

            <!-- Warnung wenn unter Minimum -->
            <div v-if="assignment.staff.length < assignment.shift.min_staff" class="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
              <Icon name="mdi:alert" class="text-lg" />
              <span class="text-sm">{{ assignment.shift.min_staff - assignment.staff.length }} fehlt</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Konfiguration Dialog -->
    <PrimeDialog
      v-model:visible="showConfigDialog"
      header="Rotationsmuster einrichten"
      modal
      :style="{ width: '35rem' }"
    >
      <div class="space-y-6">
        <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div class="flex items-start gap-3">
            <Icon name="mdi:information" class="text-xl text-blue-500 mt-0.5" />
            <div class="text-sm text-blue-700 dark:text-blue-300">
              <p class="font-medium mb-1">So funktioniert die Rotation:</p>
              <p>Das Schichtmuster wiederholt sich regelmäßig. Lege die Zykluslänge und den Startpunkt fest.</p>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-4">
          <div class="flex flex-col gap-2">
            <label class="font-medium">Zykluslänge</label>
            <PrimeInputNumber
              v-model="configForm.cycle_length"
              :min="1"
              :max="52"
              show-buttons
              suffix=" Wochen"
            />
          </div>
          <div class="flex flex-col gap-2">
            <label class="font-medium">Startjahr</label>
            <PrimeInputNumber
              v-model="configForm.start_year"
              :min="2020"
              :max="2030"
              :use-grouping="false"
            />
          </div>
          <div class="flex flex-col gap-2">
            <label class="font-medium">Startwoche</label>
            <PrimeInputNumber
              v-model="configForm.start_week"
              :min="1"
              :max="53"
              show-buttons
            />
          </div>
        </div>

        <!-- Live-Vorschau -->
        <div class="border dark:border-gray-700 rounded-lg overflow-hidden">
          <div class="px-4 py-2 bg-gray-100 dark:bg-gray-700 font-medium text-sm">
            Vorschau Wochenzuordnung
          </div>
          <div class="p-4 space-y-1 text-sm">
            <div
              v-for="preview in configPreview"
              :key="`${preview.year}-${preview.week}`"
              class="flex justify-between py-1 rounded px-2"
              :class="preview.isStart ? 'bg-green-100 dark:bg-green-900/30 font-medium' : ''"
            >
              <span>KW {{ preview.week }}/{{ preview.year }}</span>
              <span class="text-gray-600 dark:text-gray-400">
                → Musterwoche {{ preview.patternWeek }}
                <span v-if="preview.isStart" class="text-green-600 dark:text-green-400 ml-1">(Start)</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <PrimeButton label="Abbrechen" text @click="showConfigDialog = false" />
        <PrimeButton
          label="Speichern"
          :loading="savingConfig"
          @click="saveConfig"
        />
      </template>
    </PrimeDialog>

    <!-- Assign Dialog (Fallback für Klick-Zuweisung) -->
    <PrimeDialog
      v-model:visible="showAssignDialog"
      :header="`Mitarbeiter zu '${assignContext?.shiftName}' (Woche ${assignContext?.patternWeek}) hinzufügen`"
      modal
      :style="{ width: '25rem' }"
    >
      <div class="space-y-2">
        <p v-if="availableStaffForAssign.length === 0" class="text-gray-500">
          Alle aktiven Mitarbeiter sind bereits zugewiesen.
        </p>
        <div
          v-for="staff in availableStaffForAssign"
          :key="staff.staff_id"
          class="flex justify-between items-center p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer"
          @click="assignStaff(staff.staff_id)"
        >
          <span class="text-gray-900 dark:text-white">{{ staff.name }}</span>
          <PrimeTag
            v-if="staff.is_parttime"
            value="Teilzeit"
            severity="secondary"
            class="text-xs"
          />
        </div>
      </div>
    </PrimeDialog>

    <!-- Generate Preview Dialog -->
    <PrimeDialog
      v-model:visible="showPreviewDialog"
      header="Schichtplan aus Muster generieren"
      modal
      :style="{ width: '30rem' }"
    >
      <div class="space-y-4">
        <p class="text-gray-600 dark:text-gray-400">
          Generiert Schichtpläne basierend auf dem definierten Rotationsmuster.
        </p>

        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-2">
            <label class="font-medium">Startjahr</label>
            <PrimeInputNumber
              v-model="previewYear"
              :min="2020"
              :max="2030"
              :use-grouping="false"
            />
          </div>
          <div class="flex flex-col gap-2">
            <label class="font-medium">Startwoche</label>
            <PrimeInputNumber
              v-model="previewWeek"
              :min="1"
              :max="53"
              show-buttons
            />
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <label class="font-medium">Anzahl Wochen</label>
          <PrimeInputNumber
            v-model="previewWeeks"
            :min="1"
            :max="52"
            show-buttons
          />
        </div>

        <!-- Vorschau VOR dem Generieren -->
        <div v-if="!generateResult" class="border dark:border-gray-700 rounded-lg overflow-hidden">
          <div class="px-4 py-2 bg-gray-100 dark:bg-gray-700 font-medium text-sm">
            Vorschau: Diese Wochen werden generiert
          </div>
          <div class="p-4 space-y-1 text-sm max-h-48 overflow-y-auto">
            <div
              v-for="preview in generatePreviewList"
              :key="`${preview.year}-${preview.week}`"
              class="flex justify-between py-1"
            >
              <span>KW {{ preview.week }}/{{ preview.year }}</span>
              <span class="text-gray-600 dark:text-gray-400">→ Musterwoche {{ preview.patternWeek }}</span>
            </div>
          </div>
        </div>

        <!-- Ergebnis NACH dem Generieren -->
        <div v-if="generateResult" class="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <p class="font-medium text-green-700 dark:text-green-400 mb-2">
            ✓ {{ generateResult.generated }} Wochen generiert
          </p>
          <div class="text-sm text-green-600 dark:text-green-300 space-y-1">
            <div v-for="week in generateResult.weeks" :key="`${week.year}-${week.week}`">
              KW {{ week.week }}/{{ week.year }} → Musterwoche {{ week.pattern_week }}
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <PrimeButton label="Schließen" text @click="showPreviewDialog = false; generateResult = null" />
        <PrimeButton
          label="Generieren"
          icon="pi pi-sparkles"
          :loading="generating"
          @click="generatePreview"
        />
      </template>
    </PrimeDialog>
  </div>
</template>
