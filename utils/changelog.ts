/**
 * Changelog-Daten für das Update-Banner
 * 
 * Bei neuen Features einfach einen neuen Eintrag OBEN hinzufügen.
 * Die Version kommt automatisch aus package.json — hier nur
 * Datum, Titel und Änderungen pflegen.
 */

export interface ChangelogEntry {
  date: string
  title: string
  changes: string[]
}

export const CHANGELOG: ChangelogEntry[] = [
  // ↓ Neuester Eintrag immer oben ↓
  {
    date: '2026-04-13',
    title: 'Feiertage & Benachrichtigungen',
    changes: [
      'Feiertage & Schulferien für Sachsen und Brandenburg',
      'Update-Banner zeigt Neuerungen nach jedem Update',
      'Info-Button im Header zum erneuten Aufrufen',
    ],
  },
  {
    date: '2025-09-17',
    title: 'Wochenvorschau',
    changes: [
      'Wochenvorschau mit den nächsten 3 Wochen',
      'Samstagslogik: Ab Samstag wird automatisch die nächste Woche angezeigt',
      'Kompakteres UI-Layout',
      'Auto-generierte README-Dokumentation',
    ],
  },
  {
    date: '2025-06-01',
    title: 'Erster Release',
    changes: [
      'Wochenbasierte Schichtplanung',
      'Automatisches Rotationssystem',
      'Admin-Authentifizierung',
    ],
  },
]
