import { isWeekendDate } from "~/shared/utils/iso-date";

/** Today in the browser's time zone as YYYY-MM-DD. */
export function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
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
