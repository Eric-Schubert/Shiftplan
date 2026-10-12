/** The seven dates (YYYY-MM-DD) of an ISO week, Monday first. */
export function weekDates(year: number, week: number): string[] {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() || 7) - 1) + (week - 1) * 7);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday);
    day.setUTCDate(monday.getUTCDate() + index);
    return day.toISOString().slice(0, 10);
  });
}

/** Today in the browser's time zone as YYYY-MM-DD. */
export function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function isWeekendDate(date: string): boolean {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
}

/** The date itself, or the following Monday for a Saturday or Sunday. */
export function nextWeekday(date: string): string {
  const day = new Date(`${date}T00:00:00Z`);
  while (isWeekendDate(day.toISOString().slice(0, 10))) day.setUTCDate(day.getUTCDate() + 1);
  return day.toISOString().slice(0, 10);
}

/** How a range relates to the weekend: none, some or only weekend days. */
export function weekendShare(from: string, to: string): "none" | "some" | "all" {
  let weekend = 0;
  let total = 0;
  for (const day = new Date(`${from}T00:00:00Z`); day <= new Date(`${to}T00:00:00Z`) && total < 400; day.setUTCDate(day.getUTCDate() + 1)) {
    total++;
    if (isWeekendDate(day.toISOString().slice(0, 10))) weekend++;
  }
  return weekend === 0 ? "none" : weekend === total ? "all" : "some";
}
