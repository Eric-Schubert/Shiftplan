/**
 * Changelog-Daten fuer das Update-Banner.
 *
 * Eintraege werden im Docker-Build aus Git-Tags via git-cliff generiert.
 * Die App zeigt nur diese generierten Eintraege; wenn keine vorhanden sind,
 * bleibt der Versionsverlauf leer.
 */

export interface ChangelogEntry {
  date: string
  title: string
  changes: string[]
}

// Automatisch generierte Eintraege (aus git-cliff via scripts/generate-changelog.js)
let generatedEntries: ChangelogEntry[] = []
try {
  // @ts-ignore - Datei wird beim Docker-Build generiert.
  generatedEntries = await import('./changelog.generated.json').then(m => m.default || m)
} catch {
  // Datei existiert noch nicht (erster Dev-Start oder fehlgeschlagene Generierung).
  generatedEntries = []
}

/**
 * Archiv-Eintraege aus der Zeit vor der automatischen Release-Generierung.
 *
 * Diese Eintraege werden nur an einen erfolgreich generierten Changelog
 * angehaengt. Sie sind kein Fallback, damit ein kaputter Build nicht so wirkt,
 * als waere der Versionsverlauf aktuell.
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

function mergeChangelogs(generated: ChangelogEntry[], legacy: ChangelogEntry[]): ChangelogEntry[] {
  if (generated.length === 0) return []

  const seen = new Set(generated.map(entry => `${entry.date}:${entry.title.toLowerCase()}`))
  const archivedEntries = legacy.filter(entry => !seen.has(`${entry.date}:${entry.title.toLowerCase()}`))

  return [...generated, ...archivedEntries].sort(compareChangelogEntries)
}

function parseVersionParts(version: string): number[] {
  const match = version.match(/\d+(?:\.\d+)*/)
  if (!match) return []

  return match[0].split('.').map(part => Number.parseInt(part, 10))
}

export function compareVersions(a: string, b: string): number {
  const aParts = parseVersionParts(a)
  const bParts = parseVersionParts(b)
  const maxLength = Math.max(aParts.length, bParts.length)

  for (let i = 0; i < maxLength; i += 1) {
    const diff = (aParts[i] || 0) - (bParts[i] || 0)
    if (diff !== 0) return diff
  }

  return a.localeCompare(b)
}

export function compareChangelogEntries(a: ChangelogEntry, b: ChangelogEntry): number {
  return b.date.localeCompare(a.date) || compareVersions(b.title, a.title)
}

export const CHANGELOG: ChangelogEntry[] = mergeChangelogs(generatedEntries, LEGACY_CHANGELOG)
