import type { ChangelogEntry } from '../changelog'

export function formatVersion(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return 'v0.0.0'
  return trimmed.startsWith('v') ? trimmed : `v${trimmed}`
}

export function extractVersion(value: string): string | null {
  const match = value.match(/v?\d+(?:\.\d+)+(?:[-+][A-Za-z0-9.-]+)?/)
  return match ? formatVersion(match[0]) : null
}

function normalizeVersion(value: string): string | null {
  const version = extractVersion(value)
  return version ? version.replace(/\+.*$/, '') : null
}

export function formatReleaseTitle(entry: ChangelogEntry): string {
  const version = extractVersion(entry.title)
  return version ? `Release ${version}` : entry.title
}

/** Whether the entry belongs to the installed version (build metadata ignored). */
export function isCurrentRelease(entry: ChangelogEntry, currentVersion: string): boolean {
  return normalizeVersion(entry.title) === normalizeVersion(currentVersion)
}

export function releaseUrl(entry: ChangelogEntry): string | null {
  const version = normalizeVersion(entry.title)
  return version ? `https://github.com/Eric-Schubert/Shiftplan/releases/tag/${version}` : null
}
