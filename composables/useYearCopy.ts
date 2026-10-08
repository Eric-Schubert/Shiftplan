import type { RotationYearCopyPreview, RotationYearCopyResult } from "~/types/rotation";

/** Copies all shift assignments of one year into another; the preview follows the source year. */
export function useYearCopy(isVisible: () => boolean) {
  const { authFetch } = useAuthFetch();

  const sourceYear = ref(new Date().getFullYear());
  const targetYear = ref(new Date().getFullYear() + 1);
  const overwrite = ref(false);
  const copying = ref(false);
  const loading = ref(false);
  const preview = ref<RotationYearCopyPreview | null>(null);
  const result = ref<RotationYearCopyResult | null>(null);
  const error = ref<string | null>(null);

  const canCopy = computed(() => {
    return !!preview.value && preview.value.totalWeeks > 0 && sourceYear.value !== targetYear.value;
  });

  watch(isVisible, (visible) => {
    if (visible) {
      resetTransientState();
      void loadPreview();
      return;
    }

    resetTransientState();
  });

  watch(sourceYear, () => {
    if (isVisible()) {
      void loadPreview();
    }
  });

  function resetTransientState() {
    error.value = null;
    result.value = null;
  }

  async function loadPreview() {
    loading.value = true;
    resetTransientState();
    preview.value = null;

    try {
      preview.value = await $fetch<RotationYearCopyPreview>("/api/shiftplan/year-summary", {
        query: { year: sourceYear.value },
      });
    } catch (requestError: any) {
      error.value = requestError.data?.statusMessage || "Fehler beim Laden der Vorschau";
    } finally {
      loading.value = false;
    }
  }

  async function executeCopy() {
    copying.value = true;
    resetTransientState();

    try {
      result.value = await authFetch<RotationYearCopyResult>("/api/shiftplan/copy-year", {
        method: "POST",
        body: {
          sourceYear: sourceYear.value,
          targetYear: targetYear.value,
          overwrite: overwrite.value,
        },
      });
    } catch (requestError: any) {
      error.value = requestError.data?.statusMessage || "Fehler beim Kopieren";
    } finally {
      copying.value = false;
    }
  }

  return { sourceYear, targetYear, overwrite, copying, loading, preview, result, error, canCopy, executeCopy };
}
