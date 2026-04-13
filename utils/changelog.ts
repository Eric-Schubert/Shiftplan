/**
 * Changelog-Daten für das Update-Banner
 *
 * Bei neuen Features einfach einen neuen Eintrag OBEN hinzufügen.
 * Die Version kommt automatisch aus package.json — hier nur
 * Datum, Titel und Änderungen pflegen.
 *
 * WICHTIG: Neuester Eintrag immer oben! (absteigend nach Datum)
 */

/**
 *   {
 *     date: 'Release Datum',
 *     title: 'Überschrift',
 *     changes: [
 *       'inhalt der änderung',
 *       'inhalt der änderung',
 *       'inhalt der änderung',
 *       'inhalt der änderung',
 *       'inhalt der änderung',
 *     ],
 *   },
 */

export interface ChangelogEntry {
  date: string
  title: string
  changes: string[]
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    date: '2026-04-13',
    title: 'Update-Banner & Versionsverlauf',
    changes: [
      'Changelog-Banner zeigt Neuerungen nach jedem Update',
      'Versionsverlauf über ⓘ-Button im Header jederzeit aufrufbar',
      'Automatische Versionierung bei jedem Build',
    ],
  },
  {
    date: '2026-02-03',
    title: 'Feiertage & Schulferien',
    changes: [
      'Deutsche Feiertage und sächsische Feiertage via OpenHolidays API',
      'Schulferien für Sachsen und Brandenburg',
      'Kompakte Anzeige in der Wochenvorschau',
      'Detailansicht mit farbigen Markierungen (rot/orange/blau)',
      '24h Server-Cache für API-Anfragen',
    ],
  },
  {
    date: '2026-01-04',
    title: 'Docker & CI/CD',
    changes: [
      'Docker-Support mit Multi-Stage Build',
      'Docker Compose mit Traefik-Integration',
      'GitHub Actions CI-Pipeline (Tests, Build, Typecheck)',
      'Automatische README-Generierung nach erfolgreichem CI',
      'Automatisches Docker-Image Build & Push (GHCR)',
    ],
  },
  {
    date: '2026-01-04',
    title: 'Wochenvorschau & UI-Verbesserungen',
    changes: [
      'Vorschau der nächsten 3 Wochen auf einen Blick',
      'Samstagslogik: Ab Samstag wird automatisch die nächste Woche angezeigt',
      'Kompakteres UI-Layout',
      'Jahres-Kopie: Schichtpläne zwischen Jahren übertragen',
    ],
  },
  {
    date: '2026-01-03',
    title: 'Sicherheits-Update',
    changes: [
      'Serverseitige API-Authentifizierung (war vorher nur im Frontend!)',
      'Session-Management mit HttpOnly & Secure Cookies',
      'Rate Limiting gegen Brute-Force (5 Versuche / 15 Min)',
      'Passwort-Richtlinie mit Mindestanforderungen',
      'Passwort-Ändern Dialog im Admin-Bereich',
      'Getrennte Datenbanken für Nutzdaten und Admin-Credentials',
    ],
  },
  {
    date: '2026-01-03',
    title: 'Rotationssystem',
    changes: [
      'Automatisches 7-Wochen-Rotationsmuster',
      'Konfigurierbare Zykluslänge und Startwoche',
      'Musterwoche-Berechnung kompatibel mit dem alten PHP-System',
      'Bulk-Generierung: Mehrere Wochen auf einmal erstellen',
      'Rotationsmanager-UI zum Einrichten der Muster',
    ],
  },
  {
    date: '2026-01-01',
    title: 'Erster Release',
    changes: [
      'Wochenbasierte Schichtplanung mit Kalenderwochen-Navigation',
      'Mitarbeiterverwaltung (Vollzeit/Teilzeit, Aktiv/Inaktiv)',
      'Schichtenverwaltung mit flexiblen Zeiten und Farben',
      'Drag & Drop Zuweisung von Mitarbeitern zu Schichten',
      'Dark Mode mit persistenter Einstellung',
      'Responsive Design für Desktop, Tablet und Mobil',
      'Admin-Authentifizierung mit Passwortschutz',
    ],
  },
]