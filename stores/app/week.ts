export type UpcomingWeek = { year: number; week: number; dateRange: string };

export function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function getDateOfISOWeek(week: number, year: number): Date {
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay();
  const ISOweekStart = simple;
  if (dow <= 4) {
    ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  } else {
    ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
  }
  return ISOweekStart;
}

export function getISOWeeksInYear(year: number): number {
  const d = new Date(year, 11, 31);
  const week = getISOWeek(d);
  return week === 1 ? 52 : week;
}

/** Monday to Sunday of an ISO week. */
export function getWeekDateRange(week: number, year: number): { start: Date; end: Date } {
  const start = getDateOfISOWeek(week, year);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start, end };
}

/** „06.10. – 12.10.“ */
export function formatWeekDateRange({ start, end }: { start: Date; end: Date }): string {
  const formatDate = (date: Date) => date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
  return `${formatDate(start)} – ${formatDate(end)}`;
}

/** The `count` weeks after the given one, across year boundaries. */
export function getUpcomingWeeks(year: number, week: number, count: number): UpcomingWeek[] {
  const weeks: UpcomingWeek[] = [];

  for (let i = 0; i < count; i++) {
    week++;
    if (week > getISOWeeksInYear(year)) {
      week = 1;
      year++;
    }
    weeks.push({ year, week, dateRange: formatWeekDateRange(getWeekDateRange(week, year)) });
  }

  return weeks;
}

/** ISO week-numbering year: Monday 29.12.2025 already belongs to week 1 of 2026. */
export function getISOWeekYear(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  return d.getUTCFullYear();
}

/** Today, or next Monday on Saturday and Sunday when the team does not work weekends. */
function plannerDate(nextWeekFromSaturday: boolean): Date {
  const date = new Date();
  const day = date.getDay();
  if (nextWeekFromSaturday && (day === 6 || day === 0)) {
    date.setDate(date.getDate() + (day === 6 ? 2 : 1));
  }
  return date;
}

export function getEffectiveCurrentWeek(nextWeekFromSaturday = true): number {
  return getISOWeek(plannerDate(nextWeekFromSaturday));
}

export function getEffectiveCurrentYear(nextWeekFromSaturday = true): number {
  return getISOWeekYear(plannerDate(nextWeekFromSaturday));
}
