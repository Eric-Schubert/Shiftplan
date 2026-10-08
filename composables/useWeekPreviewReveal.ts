/** Renders the week preview only once its placeholder comes close to the viewport. */
export function useWeekPreviewReveal() {
  const weekPreviewSentinel = ref<HTMLElement | null>(null);
  const showWeekPreview = ref(false);
  let weekPreviewObserver: IntersectionObserver | null = null;

  onMounted(() => {
    if (!weekPreviewSentinel.value || !("IntersectionObserver" in window)) {
      showWeekPreview.value = true;
      return;
    }

    weekPreviewObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          showWeekPreview.value = true;
          weekPreviewObserver?.disconnect();
          weekPreviewObserver = null;
        }
      },
      { rootMargin: "240px 0px" }
    );

    weekPreviewObserver.observe(weekPreviewSentinel.value);
  });

  onBeforeUnmount(() => {
    weekPreviewObserver?.disconnect();
  });

  return { weekPreviewSentinel, showWeekPreview };
}
