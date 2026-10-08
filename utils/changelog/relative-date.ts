interface DateParts {
  year: number
  month: number
  day: number
}

function parseDateParts(date: string): DateParts | null {
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null

  const [, year, month, day] = match
  if (!year || !month || !day) return null

  return {
    year: Number.parseInt(year, 10),
    month: Number.parseInt(month, 10),
    day: Number.parseInt(day, 10),
  }
}

function toUtcDayNumber(parts: DateParts): number {
  return Math.floor(Date.UTC(parts.year, parts.month - 1, parts.day) / 86_400_000)
}

function todayParts(today: Date): DateParts {
  return {
    year: today.getFullYear(),
    month: today.getMonth() + 1,
    day: today.getDate(),
  }
}

export function getCalendarDayDiff(date: string, today = new Date()): number | null {
  const parts = parseDateParts(date)
  if (!parts) return null

  const diff = toUtcDayNumber(todayParts(today)) - toUtcDayNumber(parts)
  return Math.max(0, diff)
}

export function formatRelativeChangelogDate(date: string, today = new Date()): string {
  const diffDays = getCalendarDayDiff(date, today)
  if (diffDays === null) return date

  if (diffDays === 0) return 'heute'
  if (diffDays === 1) return 'gestern'
  return `vor ${diffDays} Tagen`
}
