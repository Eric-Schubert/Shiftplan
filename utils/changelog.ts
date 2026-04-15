/**
 * Changelog-Daten für das Update-Banner
 *
 * AUTOMATISCH: Einträge werden aus Git-Tags via git-cliff generiert.
 * LEGACY: Ältere Einträge (vor der Automatisierung) stehen als Fallback unten.
 *
 * Die Generierung läuft über: npm run changelog
 * Im CI wird das automatisch vor dem Build ausgeführt.
 */

export interface ChangelogEntry {
  date: string
  title: string
  changes: string[]
}

// Automatisch generierte Einträge (aus git-cliff via scripts/generate-changelog.js)
let generatedEntries: ChangelogEntry[] = []
try {
  // @ts-ignore — Datei wird beim Build generiert, existiert nicht im Repo
  generatedEntries = await import('./changelog.generated.json').then(m => m.default || m)
} catch {
  // Datei existiert noch nicht (erster Dev-Start oder git-cliff nicht installiert)
  generatedEntries = []
}

/**
 * Legacy-Einträge: Vor der git-cliff Automatisierung manuell gepflegt.
 * Diese werden angezeigt wenn kein generierter Eintrag mit gleichem Datum existiert.
 */
const LEGACY_CHANGELOG: ChangelogEntry[] = [
  {
    date: '2026-04-15',
    title: 'Role-Based Access Control',
    changes: [
      'New planner role for quick shift reassignments without full admin access',
      'User management in admin settings to create and manage planner accounts',
      'Audit log tracking all manual shift changes with user, timestamp and reason',
      'Login now requires username and password',
      'Role-based UI: planners see edit controls, admins see full settings',
    ],
  },
  {
    date: '2026-04-13',
    title: 'UI/UX',
    changes: [
      'Swipe navigation between calendar weeks on mobile devices',
      'Drag & drop staff assignment in shift plan and rotation pattern',
      'Staff pool for drag-in in rotation pattern editor',
      'Copy shift plans from one year to another',
    ],
  },
  {
    date: '2026-04-12',
    title: 'Update Banner & Version History',
    changes: [
      'Changelog banner shows updates after each deploy',
      'Version history accessible via info button in header',
      'Automatic versioning on every build',
    ],
  },
  {
    date: '2026-02-03',
    title: 'Holidays & School Vacations',
    changes: [
      'German public holidays and Saxony regional holidays via OpenHolidays API',
      'School vacations for Saxony and Brandenburg',
      'Compact display in week preview',
      'Detail view with color-coded markers',
      '24h server cache for API requests',
    ],
  },
  {
    date: '2026-01-04',
    title: 'Docker & CI/CD',
    changes: [
      'Docker support with multi-stage build',
      'Docker Compose with Traefik integration',
      'GitHub Actions CI pipeline (tests, build, typecheck)',
      'Automatic README generation after successful CI',
      'Automatic Docker image build & push (GHCR)',
    ],
  },
  {
    date: '2026-01-04',
    title: 'Week Preview & UI Improvements',
    changes: [
      'Preview of next 3 weeks at a glance',
      'Saturday logic: automatically shows next week from Saturday onwards',
      'More compact UI layout',
      'Year copy: transfer shift plans between years',
    ],
  },
  {
    date: '2026-01-03',
    title: 'Security Update',
    changes: [
      'Server-side API authentication',
      'Session management with HttpOnly & Secure cookies',
      'Rate limiting against brute force (5 attempts / 15 min)',
      'Password policy with minimum requirements',
      'Change password dialog in admin area',
      'Separate databases for user data and admin credentials',
    ],
  },
  {
    date: '2026-01-03',
    title: 'Rotation System',
    changes: [
      'Automatic 7-week rotation pattern',
      'Configurable cycle length and start week',
      'Pattern week calculation compatible with legacy PHP system',
      'Bulk generation: create multiple weeks at once',
      'Rotation manager UI for setting up patterns',
    ],
  },
  {
    date: '2026-01-01',
    title: 'Initial Release',
    changes: [
      'Week-based shift planning with calendar week navigation',
      'Staff management (full-time/part-time, active/inactive)',
      'Shift management with flexible times and colors',
      'Drag & drop assignment of staff to shifts',
      'Dark mode with persistent setting',
      'Responsive design for desktop, tablet and mobile',
      'Admin authentication with password protection',
    ],
  },
]

/**
 * Finaler Changelog: Generierte Einträge haben Vorrang.
 * Legacy-Einträge werden nur angehängt wenn kein generierter Eintrag
 * mit gleichem Datum existiert.
 */
function mergeChangelogs(generated: ChangelogEntry[], legacy: ChangelogEntry[]): ChangelogEntry[] {
  if (generated.length === 0) return legacy

  const generatedDates = new Set(generated.map(e => e.date))
  const uniqueLegacy = legacy.filter(e => !generatedDates.has(e.date))

  return [...generated, ...uniqueLegacy]
}

export const CHANGELOG: ChangelogEntry[] = mergeChangelogs(generatedEntries, LEGACY_CHANGELOG)
