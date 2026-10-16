import { CHANGELOG } from "~/utils/changelog";
import type { ChangelogEntry } from "~/utils/changelog";
import { extractVersion } from "~/utils/changelog/release-format";

const isVisible = ref(false);
const entries = ref<ChangelogEntry[]>([]);

export function useChangelog() {
  const config = useRuntimeConfig();
  const currentVersion = config.public.appVersion as string;

  function openHistory() {
    if (CHANGELOG.length > 0) {
      entries.value = [...CHANGELOG];
      isVisible.value = true;
    }
  }

  function dismiss() {
    isVisible.value = false;
  }

  return {
    isVisible,
    entries,
    currentVersion,
    openHistory,
    dismiss,
  };
}

/** „Release v3.11.0“, or the plain title of an entry without a version. Call it in setup. */
export function useReleaseTitle() {
  const { t } = useI18n();
  return (entry: ChangelogEntry): string => {
    const version = extractVersion(entry.title);
    return version ? t("changelog.releaseTitle", { version }) : entry.title;
  };
}
