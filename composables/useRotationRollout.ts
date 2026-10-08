import type { GenerationPreviewWeek, GenerationResult } from "~/types/shiftplan";
import { getIsoWeeksInYear } from "~/utils/rotation";

/** Rolls the rotation pattern out into weekly plans, with a debounced preview of the affected weeks. */
export function useRotationRollout(
  initialYear: number,
  initialWeek: number,
  onGenerated: (result: GenerationResult) => void
) {
  const { authFetch } = useAuthFetch();

  const startYear = ref(initialYear);
  const startWeek = ref(initialWeek);
  const untilYearEnd = ref(true);
  const weekCount = ref(4);
  const overwrite = ref(false);

  const preview = ref<GenerationPreviewWeek[]>([]);
  const loadingPreview = ref(false);
  const generating = ref(false);
  const errorMessage = ref<string | null>(null);
  const result = ref<GenerationResult | null>(null);

  const maxWeekInStartYear = computed(() => getIsoWeeksInYear(startYear.value));
  const weeksToGenerate = computed(() => {
    if (!untilYearEnd.value) return weekCount.value || 1;
    return Math.max(1, maxWeekInStartYear.value - startWeek.value + 1);
  });
  const plannedWeeks = computed(() => preview.value.filter((week) => week.existing_assignments > 0));
  const affectedWeeks = computed(() =>
    overwrite.value ? preview.value : preview.value.filter((week) => week.existing_assignments === 0)
  );

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
      onGenerated(result.value);
      await loadPreview();
    } catch (error: any) {
      errorMessage.value =
        error.data?.statusMessage || "Ausrollen fehlgeschlagen. Es wurde nichts verändert.";
    } finally {
      generating.value = false;
    }
  }

  return {
    startYear,
    startWeek,
    untilYearEnd,
    weekCount,
    overwrite,
    preview,
    loadingPreview,
    generating,
    errorMessage,
    result,
    maxWeekInStartYear,
    plannedWeeks,
    affectedWeeks,
    generate,
  };
}
