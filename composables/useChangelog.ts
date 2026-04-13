/**
 * Composable für das Changelog/Update-Banner
 * 
 * Vergleicht die package.json Version mit localStorage.
 * Hat sich die Version geändert → zeigt den neuesten Changelog-Eintrag.
 * 
 * State ist modul-level → wird zwischen allen Komponenten geteilt.
 */
import { CHANGELOG } from '~/utils/changelog'
import type { ChangelogEntry } from '~/utils/changelog'

const STORAGE_KEY = 'schichtplaner_lastSeenVersion'

// Shared State
const isVisible = ref(false)
const latestEntry = ref<ChangelogEntry | null>(null)

export function useChangelog() {
  const config = useRuntimeConfig()
  const currentVersion = config.public.appVersion as string

  /**
   * Prüft ob sich die Version seit dem letzten Besuch geändert hat
   */
  function check() {
    if (!import.meta.client) return

    const lastSeen = localStorage.getItem(STORAGE_KEY)

    // Gleiche Version → nichts zeigen
    if (lastSeen === currentVersion) return

    // Neue Version oder erster Besuch → neuesten Eintrag zeigen
    if (CHANGELOG.length > 0) {
      latestEntry.value = CHANGELOG[0]
      isVisible.value = true
    }
  }

  /**
   * Banner manuell öffnen (Info-Button im Header)
   */
  function open() {
    if (CHANGELOG.length > 0) {
      latestEntry.value = CHANGELOG[0]
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
    latestEntry,
    currentVersion,
    check,
    open,
    dismiss,
  }
}
