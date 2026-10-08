<script setup lang="ts">
import type { GenerationPreviewWeek, GenerationResult } from "~/types/shiftplan";
import { getIsoWeekOfDate, getIsoWeeksInYear } from "~/utils/rotation";

const props = defineProps<{
  initialYear: number;
  initialWeek: number;
}>();

const emit = defineEmits<{
  (e: "generated", result: GenerationResult): void;
}>();

const { authFetch } = useAuthFetch();

const startYear = ref(props.initialYear);
const startWeek = ref(props.initialWeek);
const untilYearEnd = ref(true);
const weekCount = ref(4);
const overwrite = ref(false);

const preview = ref<GenerationPreviewWeek[]>([]);
const loadingPreview = ref(false);
const generating = ref(false);
const errorMessage = ref<string | null>(null);
const result = ref<GenerationResult | null>(null);

const today = getIsoWeekOfDate(new Date());
const maxWeekInStartYear = computed(() => getIsoWeeksInYear(startYear.value));

const weeksToGenerate = computed(() => {
  if (!untilYearEnd.value) return weekCount.value || 1;
  return Math.max(1, maxWeekInStartYear.value - startWeek.value + 1);
});

const plannedWeeks = computed(() => preview.value.filter((week) => week.existing_assignments > 0));
const affectedWeeks = computed(() =>
  overwrite.value ? preview.value : preview.value.filter((week) => week.existing_assignments === 0)
);
const dayChangesInAffectedWeeks = computed(() =>
  affectedWeeks.value.reduce((total, week) => total + week.day_changes, 0)
);
const startsInPast = computed(
  () => startYear.value < today.year || (startYear.value === today.year && startWeek.value < today.week)
);
const lastPreviewWeek = computed(() => preview.value.at(-1));

const submitLabel = computed(() => {
  if (loadingPreview.value && preview.value.length === 0) return "Vorschau wird geladen …";
  const count = affectedWeeks.value.length;
  if (count === 0) return "Nichts zu tun";
  const label = count === 1 ? "1 Woche ausrollen" : `${count} Wochen ausrollen`;
  return overwrite.value && plannedWeeks.value.length > 0
    ? `${label} (${plannedWeeks.value.length} überschreiben)`
    : label;
});

function weekStatus(week: GenerationPreviewWeek): { label: string; tone: string } {
  if (week.existing_assignments === 0) {
    return { label: "Neu", tone: "bg-[var(--positive-soft)] text-[var(--positive-ink)]" };
  }
  if (overwrite.value) {
    return { label: "Wird überschrieben", tone: "bg-[var(--danger-soft)] text-[var(--danger-ink)]" };
  }
  return { label: "Bleibt wie geplant", tone: "bg-[var(--surface-muted)] text-[var(--text-2)]" };
}

watch(startYear, () => {
  if (startWeek.value > maxWeekInStartYear.value) startWeek.value = maxWeekInStartYear.value;
});

let previewTimer: ReturnType<typeof setTimeout> | undefined;
let previewRequest = 0;

watch(
  [startYear, startWeek, weeksToGenerate],
  () => {
    clearTimeout(previewTimer);
    loadingPreview.value = true;
    previewTimer = setTimeout(loadPreview, 250);
  },
  { immediate: true }
);

onBeforeUnmount(() => clearTimeout(previewTimer));

async function loadPreview() {
  const request = ++previewRequest;
  if (!startYear.value || !startWeek.value) {
    loadingPreview.value = false;
    return;
  }

  loadingPreview.value = true;
  errorMessage.value = null;

  try {
    const data = await authFetch<{ weeks: GenerationPreviewWeek[] }>("/api/shiftplan/generate-preview", {
      query: { year: startYear.value, week: startWeek.value, weeks: weeksToGenerate.value },
    });
    if (request === previewRequest) preview.value = data.weeks;
  } catch (error: any) {
    if (request === previewRequest) {
      preview.value = [];
      errorMessage.value = error.data?.statusMessage || "Vorschau konnte nicht geladen werden";
    }
  } finally {
    if (request === previewRequest) loadingPreview.value = false;
  }
}

async function generate() {
  generating.value = true;
  errorMessage.value = null;
  result.value = null;

  try {
    result.value = await authFetch<GenerationResult>("/api/shiftplan/generate", {
      method: "POST",
      body: {
        year: startYear.value,
        week: startWeek.value,
        weeks: weeksToGenerate.value,
        overwrite: overwrite.value,
      },
    });
    overwrite.value = false;
    emit("generated", result.value);
    await loadPreview();
  } catch (error: any) {
    errorMessage.value =
      error.data?.statusMessage || "Ausrollen fehlgeschlagen. Es wurde nichts verändert.";
  } finally {
    generating.value = false;
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="grid grid-cols-2 gap-3">
      <div class="flex flex-col gap-2">
        <label for="rollout-week" class="text-sm font-medium text-[var(--text-1)]">Ab KW</label>
        <PrimeInputNumber
          v-model="startWeek"
          input-id="rollout-week"
          fluid
          :min="1"
          :max="maxWeekInStartYear"
          show-buttons
        />
      </div>
      <div class="flex flex-col gap-2">
        <label for="rollout-year" class="text-sm font-medium text-[var(--text-1)]">Jahr</label>
        <PrimeInputNumber
          v-model="startYear"
          input-id="rollout-year"
          fluid
          :min="2020"
          :max="2100"
          :use-grouping="false"
          show-buttons
        />
      </div>
    </div>

    <p v-if="startsInPast" class="text-sm text-[var(--warning-ink)]">
      <i class="pi pi-exclamation-triangle mr-1" aria-hidden="true"></i>
      Die Startwoche liegt in der Vergangenheit (heute ist KW {{ today.week }}/{{ today.year }}).
    </p>

    <fieldset class="space-y-2">
      <legend class="mb-2 text-sm font-medium text-[var(--text-1)]">Bis wann?</legend>
      <label class="flex cursor-pointer items-center gap-3 text-sm text-[var(--text-2)]">
        <PrimeRadioButton v-model="untilYearEnd" :value="true" input-id="rollout-year-end" />
        <span>
          Bis Jahresende
          <span class="text-[var(--text-3)]">(KW {{ maxWeekInStartYear }}/{{ startYear }})</span>
        </span>
      </label>
      <label class="flex cursor-pointer flex-wrap items-center gap-3 text-sm text-[var(--text-2)]">
        <PrimeRadioButton v-model="untilYearEnd" :value="false" input-id="rollout-count" />
        <span>Eine bestimmte Anzahl Wochen</span>
        <PrimeInputNumber
          v-if="!untilYearEnd"
          v-model="weekCount"
          aria-label="Anzahl Wochen"
          :min="1"
          :max="53"
          show-buttons
          suffix=" Wochen"
          class="w-40"
        />
      </label>
    </fieldset>

    <div
      v-if="plannedWeeks.length > 0"
      class="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--text-2)]"
    >
      <p class="text-[var(--text-1)]">
        <strong>{{ plannedWeeks.length }} von {{ preview.length }} Wochen</strong>
        sind schon geplant.
      </p>
      <label class="mt-3 flex cursor-pointer items-start gap-3">
        <PrimeCheckbox v-model="overwrite" input-id="rollout-overwrite" binary class="mt-0.5" />
        <span>
          <span class="block font-medium text-[var(--text-1)]">Geplante Wochen überschreiben</span>
          <span class="block leading-5">
            <template v-if="overwrite">
              Diese Wochen werden komplett neu aus dem Muster befüllt. Manuelle Änderungen darin
              gehen verloren.
            </template>
            <template v-else>
              Aus: geplante Wochen bleiben, wie sie sind. Nur leere Wochen werden befüllt.
            </template>
          </span>
        </span>
      </label>
    </div>

    <p
      v-if="dayChangesInAffectedWeeks > 0"
      class="rounded-xl bg-[var(--info-soft)] px-4 py-3 text-sm leading-6 text-[var(--info-ink)]"
    >
      <i class="pi pi-info-circle mr-1" aria-hidden="true"></i>
      Im Zeitraum gibt es {{ dayChangesInAffectedWeeks }}
      {{ dayChangesInAffectedWeeks === 1 ? "Tagesänderung" : "Tagesänderungen" }} (z. B. Tausch oder
      Übernahme). Sie bleiben erhalten und gelten weiter zusätzlich zum Wochenplan.
    </p>

    <div class="overflow-hidden rounded-xl border border-[var(--border-soft)]">
      <div
        class="flex items-center justify-between bg-[var(--surface-muted)] px-4 py-2 text-sm font-medium text-[var(--text-1)]"
      >
        <span>
          Vorschau
          <template v-if="lastPreviewWeek">
            · KW {{ startWeek }}/{{ startYear }} bis KW {{ lastPreviewWeek.week }}/{{ lastPreviewWeek.year }}
          </template>
        </span>
        <i v-if="loadingPreview" class="pi pi-spinner pi-spin text-[var(--text-3)]" aria-hidden="true"></i>
      </div>
      <ul class="max-h-56 divide-y divide-[var(--border-soft)] overflow-y-auto text-sm">
        <li
          v-for="week in preview"
          :key="`${week.year}-${week.week}`"
          class="flex items-center justify-between gap-3 px-4 py-1.5"
        >
          <span class="text-[var(--text-1)]">
            KW {{ week.week }}/{{ week.year }}
            <span class="text-[var(--text-3)]">· Musterwoche {{ week.pattern_week }}</span>
          </span>
          <span class="rounded-md px-2 py-0.5 text-xs font-semibold" :class="weekStatus(week).tone">
            {{ weekStatus(week).label }}
          </span>
        </li>
      </ul>
    </div>

    <div
      v-if="result"
      class="rounded-xl bg-[var(--positive-soft)] px-4 py-3 text-sm text-[var(--positive-ink)]"
    >
      <i class="pi pi-check-circle mr-1" aria-hidden="true"></i>
      <template v-if="result.generated > 0">
        {{ result.generated }} {{ result.generated === 1 ? "Woche" : "Wochen" }} erzeugt<template
          v-if="result.overwritten > 0"
        >, davon {{ result.overwritten }} überschrieben</template><template v-if="result.skipped > 0"
        >, {{ result.skipped }} geplante übersprungen</template>.
      </template>
      <template v-else>Alle Wochen waren schon geplant, nichts verändert.</template>
    </div>

    <div
      v-if="errorMessage"
      class="rounded-xl bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger-ink)]"
    >
      {{ errorMessage }}
    </div>

    <PrimeButton
      :label="submitLabel"
      icon="pi pi-sync"
      class="min-h-11 w-full sm:w-auto"
      :severity="overwrite && plannedWeeks.length > 0 ? 'danger' : undefined"
      :loading="generating"
      :disabled="loadingPreview || affectedWeeks.length === 0"
      @click="generate"
    />
  </div>
</template>
