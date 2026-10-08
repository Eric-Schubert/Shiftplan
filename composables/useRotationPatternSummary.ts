import { getIsoWeekOfDate, getPatternWeekForCalendarWeek } from "~/utils/rotation";

/** Key figures of the stored rotation pattern, shown by the rotation wizard. */
export function useRotationPatternSummary() {
  const dataStore = useDataStore();

  const today = getIsoWeekOfDate(new Date());
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
    return getPatternWeekForCalendarWeek(
      config.cycle_length,
      config.start_year,
      config.start_week,
      today.year,
      today.week
    );
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
    assignmentsLabel,
  };
}

function assignmentsLabel(count: number): string {
  return count === 1 ? "1 Zuweisung" : `${count} Zuweisungen`;
}
