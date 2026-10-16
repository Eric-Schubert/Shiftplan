import type { WeeklyShiftplanWithPattern } from "../types/shiftplan";

/** Whether a loaded plan belongs to the given week; while another week loads, the old plan is still there. */
export function planShowsWeek(plan: WeeklyShiftplanWithPattern | null | undefined, year: number, week: number): boolean {
  return plan?.week?.year === year && plan.week.week_number === week;
}
