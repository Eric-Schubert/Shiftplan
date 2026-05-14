



import { CHANGELOG } from '~/utils/changelog'
import type { ChangelogEntry } from '~/utils/changelog'

const STORAGE_KEY = 'schichtplaner_lastSeenVersion'


const isVisible = ref(false)
const entries = ref<ChangelogEntry[]>([])
const mode = ref<'update' | 'history'>('update')

export function useChangelog() {
  const config = useRuntimeConfig()
  const currentVersion = config.public.appVersion as string




  function check() {
    if (!import.meta.client) return
    if (isVisible.value) return

    const lastSeen = localStorage.getItem(STORAGE_KEY)

    if (lastSeen === currentVersion) return

    const latestEntry = CHANGELOG[0]

    if (latestEntry) {
      mode.value = 'update'
      entries.value = [latestEntry]
      isVisible.value = true
    }
  }




  function openHistory() {
    if (CHANGELOG.length > 0) {
      mode.value = 'history'
      entries.value = [...CHANGELOG]
      isVisible.value = true
    }
  }




  function dismiss() {
    if (import.meta.client) {
      localStorage.setItem(STORAGE_KEY, currentVersion)
    }
    isVisible.value = false
  }

  return {
    isVisible,
    entries,
    mode,
    currentVersion,
    check,
    openHistory,
    dismiss,
  }
}
