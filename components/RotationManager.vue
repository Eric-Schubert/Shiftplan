<script setup lang="ts">
import type { RotationConfig } from "~/types/rotation";

const dataStore = useDataStore();

// Konfiguration bearbeiten
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

async function saveConfig() {
  savingConfig.value = true;
  try {
    await dataStore.updateRotationConfig(configForm.value);
    showConfigDialog.value = false;
  } finally {
    savingConfig.value = false;
  }
}

// Mitarbeiter zuweisen
const showAssignDialog = ref(false);
const assignContext = ref<{ patternWeek: number; shiftId: number; shiftName: string } | null>(null);
const assigning = ref(false);

function openAssignDialog(patternWeek: number, shiftId: number, shiftName: string) {
  assignContext.value = { patternWeek, shiftId, shiftName };
  showAssignDialog.value = true;
}

// Verfügbare Mitarbeiter (nicht bereits dieser Schicht in dieser Musterwoche zugewiesen)
const availableStaffForAssign = computed(() => {
  if (!assignContext.value || !dataStore.rotationPattern) return [];
  
  const weekData = dataStore.rotationPattern.weeks.find(
    w => w.pattern_week === assignContext.value!.patternWeek
  );
  if (!weekData) return dataStore.activeStaff;

  const shiftAssignment = weekData.assignments.find(
    a => a.shift.shift_id === assignContext.value!.shiftId
  );
  if (!shiftAssignment) return dataStore.activeStaff;

  const assignedIds = shiftAssignment.staff.map(s => s.staff_id);
  return dataStore.activeStaff.filter(s => !assignedIds.includes(s.staff_id));
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

// Vorschau generieren
const showPreviewDialog = ref(false);
const previewYear = ref(new Date().getFullYear());
const previewWeek = ref(1);
const previewWeeks = ref(4);
const generating = ref(false);
const generateResult = ref<{ generated: number; weeks: Array<{ year: number; week: number; pattern_week: number }> } | null>(null);

async function generatePreview() {
  generating.value = true;
  try {
    generateResult.value = await $fetch("/api/shiftplan/generate", {
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
          <p>Definiere hier, wer in welcher Musterwoche welche Schicht arbeitet. 
             Das Muster wiederholt sich automatisch alle {{ dataStore.rotationPattern?.config.cycle_length || 4 }} Wochen.</p>
        </div>
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
            class="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3"
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
              <PrimeChip
                v-for="staff in assignment.staff"
                :key="staff.staff_id"
                :label="staff.name"
                removable
                @remove="unassignStaff(weekData.pattern_week, staff.staff_id, assignment.shift.shift_id)"
              />
              
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
      header="Rotationskonfiguration"
      modal
      :style="{ width: '25rem' }"
    >
      <div class="space-y-4">
        <div class="flex flex-col gap-2">
          <label class="font-medium">Zykluslänge (Wochen)</label>
          <PrimeInputNumber
            v-model="configForm.cycle_length"
            :min="1"
            :max="12"
            show-buttons
          />
          <small class="text-gray-500">Wie viele Wochen bis sich das Muster wiederholt</small>
        </div>

        <div class="grid grid-cols-2 gap-4">
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
        <small class="text-gray-500">Ab diesem Zeitpunkt beginnt Musterwoche 1</small>
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

    <!-- Assign Dialog -->
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

        <!-- Ergebnis -->
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
