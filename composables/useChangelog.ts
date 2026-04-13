/**
 * Composable für das Changelog/Update-Banner
 * 
 * Prüft beim Seitenaufruf ob eine neue Version vorliegt
 * und zeigt einmalig die Neuerungen an.
 */
import { CHANGELOG } from '~/utils/changelog'
import type { ChangelogEntry } from '~/utils/changelog'

const STORAGE_KEY = 'schichtplaner_lastSeenVersion'

export function useChangelog() {
  const isVisible = ref(false)
  const newEntries = ref<ChangelogEntry[]>([])

  const config = useRuntimeConfig()
  const currentVersion = config.public.appVersion as string

  /**
   * Prüft ob es neue Changelog-Einträge seit dem letzten Besuch gibt
   */
  function check() {
    if (!import.meta.client) return

    const lastSeen = localStorage.getItem(STORAGE_KEY)

    // Erster Besuch überhaupt → nichts zeigen, nur Version speichern
    if (lastSeen === null) {
      localStorage.setItem(STORAGE_KEY, currentVersion)
      return
    }

    // Gleiche Version → nichts zeigen
    if (lastSeen === currentVersion) return

    // Neue Version → Einträge seit letztem Besuch sammeln
    const lastSeenIdx = CHANGELOG.findIndex(c => c.version === lastSeen)

    if (lastSeenIdx === -1) {
      // Unbekannte alte Version → nur aktuelle zeigen
      newEntries.value = CHANGELOG.slice(0, 1)
    } else if (lastSeenIdx > 0) {
      // Alle Einträge zwischen aktuell und zuletzt gesehen
      newEntries.value = CHANGELOG.slice(0, lastSeenIdx)
    }

    if (newEntries.value.length > 0) {
      isVisible.value = true
    }
  }

  /**
   * Banner schließen und aktuelle Version als gesehen markieren
   */
  function dismiss() {
    localStorage.setItem(STORAGE_KEY, currentVersion)
    isVisible.value = false
  }

  return {
    isVisible,
    newEntries,
    currentVersion,
    check,
    dismiss,
  }
}
