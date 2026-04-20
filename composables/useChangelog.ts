/**
 * Composable für das Changelog/Update-Banner
 * 
 * Zwei Modi:
 * - 'update'  → automatisch nach Deploy, zeigt nur Neues
 * - 'history' → manuell via (i)-Button, zeigt kompletten Verlauf
 * 
 * State ist modul-level → wird zwischen allen Komponenten geteilt.
 */
import { CHANGELOG } from '~/utils/changelog'
import type { ChangelogEntry } from '~/utils/changelog'

const STORAGE_KEY = 'schichtplaner_lastSeenVersion'

// Shared State
const isVisible = ref(false)
const entries = ref<ChangelogEntry[]>([])
const mode = ref<'update' | 'history'>('update')

export function useChangelog() {
  const config = useRuntimeConfig()
  const currentVersion = config.public.appVersion as string

  /**
   * Automatisch beim Seitenaufruf — zeigt nur den neuesten Eintrag
   */
  function check() {
    if (!import.meta.client) return

    const lastSeen = localStorage.getItem(STORAGE_KEY)

    if (lastSeen === currentVersion) return

    const latestEntry = CHANGELOG[0]

    if (latestEntry) {
      mode.value = 'update'
      entries.value = [latestEntry]
      isVisible.value = true
    }
  }

  /**
   * Manuell via (i)-Button — zeigt kompletten Versionsverlauf
   */
  function openHistory() {
    if (CHANGELOG.length > 0) {
      mode.value = 'history'
      entries.value = [...CHANGELOG]
      isVisible.value = true
    }
  }

  /**
   * Banner schließen und aktuelle Version merken
   */
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
