import generatedChangelog from './changelog.generated.json'
import { LEGACY_CHANGELOG } from './changelog/legacy-entries'

export { formatRelativeChangelogDate, getCalendarDayDiff } from './changelog/relative-date'

export interface ChangelogEntry {
  date: string
  title: string
  changes: string[]
}

const generatedEntries: ChangelogEntry[] = Array.isArray(generatedChangelog)
  ? generatedChangelog as ChangelogEntry[]
  : []

function mergeChangelogs(generated: ChangelogEntry[], legacy: ChangelogEntry[]): ChangelogEntry[] {
  if (generated.length === 0) {
    return import.meta.dev ? [...legacy].sort(compareChangelogEntries) : []
  }

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
