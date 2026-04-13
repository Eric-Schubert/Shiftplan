/**
 * Changelog-Daten für das Update-Banner
 * 
 * Bei neuen Features einfach einen neuen Eintrag oben hinzufügen.
 * Die Version muss zur package.json Version passen.
 * 
 * Tipp: Nur Einträge mit sichtbaren Änderungen für die Nutzer hinzufügen,
 * keine internen Refactorings oder Bug-Fixes (es sei denn sie sind relevant).
 */

export interface ChangelogEntry {
  version: string
  date: string
  title: string
  changes: string[]
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.2.0',
    date: '2026-04-13',
    title: 'Feiertage & Benachrichtigungen',
    changes: [
      'Feiertage & Schulferien für Sachsen und Brandenburg',
      'Update-Banner zeigt Neuerungen nach jedem Update',
    ],
  },
  {
    version: '1.1.0',
    date: '2025-01-01',
    title: 'Wochenvorschau',
    changes: [
      'Wochenvorschau mit den nächsten 3 Wochen',
      'Samstagslogik: Ab Samstag wird automatisch die nächste Woche angezeigt',
      'Kompakteres UI-Layout',
      'Auto-generierte README-Dokumentation',
    ],
  },
  {
    version: '1.0.0',
    date: '2024-01-01',
    title: 'Erster Release',
    changes: [
      'Wochenbasierte Schichtplanung',
      'Automatisches Rotationssystem',
      'Admin-Authentifizierung',
    ],
  },
]
