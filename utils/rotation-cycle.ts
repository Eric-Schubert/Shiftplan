import type { FullRotationPattern } from "~/types/rotation";

/** What a cycle of `cycleLength` weeks leaves behind for good: the pattern weeks beyond it and their assignments. */
export function patternWeeksBeyond(pattern: FullRotationPattern | null, cycleLength: number): { weeks: number; assignments: number } {
  const beyond = (pattern?.weeks ?? []).filter((week) => week.pattern_week > cycleLength);
  const assignments = beyond.reduce((sum, week) => sum + week.assignments.reduce((inWeek, assignment) => inWeek + assignment.staff.length, 0), 0);
  return { weeks: beyond.length, assignments };
}
