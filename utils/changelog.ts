/**
 * Changelog data for the update banner
 *
 * Add new entries at the TOP for new features.
 * The version is derived automatically from Git tags —
 * only maintain date, title, and changes here.
 *
 * IMPORTANT: Newest entry always on top! (descending by date)
 */

/**
 *   {
 *     date: 'Release date',
 *     title: 'Heading',
 *     changes: [
 *       'description of change',
 *       'description of change',
 *       'description of change',
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
      'Staff pool for drag & drop in the rotation pattern editor',
      'Copy shift plans from one year to another',
    ],
  },
  {
    date: '2026-04-13',
    title: 'Versioning & Bugfixes',
    changes: [
      'Automatic versioning from Git tags (no more manual version bumps)',
      'Version display now works correctly in Docker and CI',
    ],
  },
  {
    date: '2026-04-12',
    title: 'Update Banner & Version History',
    changes: [
      'Changelog banner shows new features after each update',
      'Version history accessible anytime via ⓘ button in the header',
      'Automatic versioning on every build',
    ],
  },
  {
    date: '2026-04-05',
    title: 'Docker & CI/CD',
    changes: [
      'Docker support with multi-stage build',
      'GitHub Actions CI pipeline (tests, build, typecheck)',
      'Automatic README generation after successful CI',
      'Automatic Docker image build & push (GHCR)',
    ],
  },
  {
    date: '2026-03-15',
    title: 'Week Preview & UI Improvements',
    changes: [
      'Preview of the next 3 weeks at a glance',
      'Saturday logic: Automatically shows next week from Saturday onwards',
      'More compact UI layout',
      'Year copy: Transfer shift plans between years',
    ],
  },
  {
    date: '2026-03-15',
    title: 'Public Holidays & School Vacations',
    changes: [
      'German and Saxony public holidays via OpenHolidays API',
      'School vacations for Saxony and Brandenburg',
      'Compact display in the week preview',
      'Detail view with color-coded markers (red/orange/blue)',
      '24h server-side cache for API requests',
    ],
  },
  {
    date: '2026-03-03',
    title: 'Security Update',
    changes: [
      'Server-side API authentication (was previously frontend-only!)',
      'Session management with HttpOnly & Secure cookies',
      'Rate limiting against brute-force attacks (5 attempts / 15 min)',
      'Password policy with minimum requirements',
      'Change password dialog in the admin area',
      'Separate databases for user data and admin credentials',
    ],
  },
  {
    date: '2026-02-05',
    title: 'Rotation System',
    changes: [
      'Automatic 7-week rotation pattern',
      'Configurable cycle length and start week',
      'Pattern week calculation compatible with the legacy PHP system',
      'Bulk generation: Create multiple weeks at once',
      'Rotation manager UI for setting up patterns',
    ],
  },
  {
    date: '2026-01-18',
    title: 'Initial Release',
    changes: [
      'Week-based shift planning with calendar week navigation',
      'Staff management (full-time/part-time, active/inactive)',
      'Shift management with flexible times and colors',
      'Drag & drop assignment of staff to shifts',
      'Dark mode with persistent setting',
      'Responsive design for desktop, tablet, and mobile',
      'Admin authentication with password protection',
    ],
  },
]