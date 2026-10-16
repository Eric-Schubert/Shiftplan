import { patternWeekFor } from "~/shared/utils/rotation-math";
import { isoWeekOfDate } from "~/shared/utils/week";

/** Key figures of the stored rotation pattern, shown by the rotation wizard. */
export function useRotationPatternSummary(today = isoWeekOfDate(new Date())) {
  const dataStore = useDataStore();

  const rotationConfig = computed(() => dataStore.rotationConfig);
  const patternWeeks = computed(() => dataStore.rotationPattern?.weeks ?? []);

  const assignmentCount = computed(() =>
    patternWeeks.value.reduce(
      (total, week) => total + week.assignments.reduce((sum, assignment) => sum + assignment.staff.length, 0),
      0
    )
  );

  const currentPatternWeek = computed(() => {
    const config = rotationConfig.value;
    if (!config) return null;
    return patternWeekFor(config.cycle_length, { year: config.start_year, week: config.start_week }, today.year, today.week);
  });

  const understaffedCount = computed(() =>
    patternWeeks.value.reduce(
      (total, week) =>
        total + week.assignments.filter((assignment) => assignment.staff.length < assignment.shift.min_staff).length,
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
