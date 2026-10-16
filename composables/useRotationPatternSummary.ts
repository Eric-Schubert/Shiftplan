import { patternWeekFor } from "~/shared/utils/rotation-math";
import { isoWeekOfDate } from "~/shared/utils/week";

/** What a shift of the pattern lacks: nobody, too few, or nothing, also when its minimum is 0. */
export function staffingGap(staffCount: number, minStaff: number): "unstaffed" | "short" | null {
  if (staffCount >= minStaff) return null;
  return staffCount === 0 ? "unstaffed" : "short";
}

/** Key figures of the stored rotation pattern, shown by the rotation wizard. */
export function useRotationPatternSummary(today = isoWeekOfDate(new Date())) {
  const dataStore = useDataStore();

  const rotationConfig = computed(() => dataStore.rotationConfig);
  const patternWeeks = computed(() => dataStore.rotationPattern?.weeks ?? []);

  const assignmentCount = computed(() =>
    patternWeeks.value.reduce((total, week) => total + week.assignments.reduce((sum, assignment) => sum + assignment.staff.length, 0), 0)
  );

  const currentPatternWeek = computed(() => {
    const config = rotationConfig.value;
    if (!config) return null;
    return patternWeekFor(config.cycle_length, { year: config.start_year, week: config.start_week }, today.year, today.week);
  });

  const understaffedCount = computed(() =>
    patternWeeks.value.reduce(
      (total, week) => total + week.assignments.filter((assignment) => staffingGap(assignment.staff.length, assignment.shift.min_staff)).length,
      0
    )
  );

  return {
    today,
    rotationConfig,
    patternWeeks,
    assignmentCount,
    currentPatternWeek,
    understaffedCount,
  };
}
