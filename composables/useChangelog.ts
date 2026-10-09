import { CHANGELOG } from '~/utils/changelog'
import type { ChangelogEntry } from '~/utils/changelog'

const isVisible = ref(false)
const entries = ref<ChangelogEntry[]>([])

export function useChangelog() {
  const config = useRuntimeConfig()
  const currentVersion = config.public.appVersion as string

  function openHistory() {
    if (CHANGELOG.length > 0) {
      entries.value = [...CHANGELOG]
      isVisible.value = true
    }
  }

  function dismiss() {
    isVisible.value = false
  }

  return {
    isVisible,
    entries,
    currentVersion,
    openHistory,
    dismiss,
  }
}
