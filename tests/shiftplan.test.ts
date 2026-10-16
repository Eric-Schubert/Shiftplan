import { beforeEach, describe, expect, it, vi } from "vitest";
import { ShiftplanService } from "~/server/services/shiftplan.service";
import { closeDatabase } from "./helpers/memory-database";
import { seedTeam, type Team } from "./helpers/service-team";

vi.mock("~/server/utils/database", () => import("./helpers/memory-database"));

let team: Team;

function staffNames(year: number, week: number) {
  return ShiftplanService.getWeeklyPlan(year, week).shifts.map((shift) => ({
    shift: shift.name,
    staff: shift.assigned_staff.map((staff) => staff.name),
  }));
}

beforeEach(() => {
  closeDatabase();
  team = seedTeam();
});

describe("weeks", () => {
  it("creates a week once and finds it again", () => {
    const created = ShiftplanService.getOrCreateWeek(2025, 1);
    const again = ShiftplanService.getOrCreateWeek(2025, 1);

    expect(created).toMatchObject({ year: 2025, week_number: 1 });
    expect(again.week_id).toBe(created.week_id);
    expect(ShiftplanService.getWeek(2025, 1)).toEqual(again);
    expect(ShiftplanService.getWeek(2025, 2)).toBeNull();
  });

  it("reads an unplanned week without creating it", () => {
    const plan = ShiftplanService.getWeeklyPlanReadOnly(2025, 5);

    expect(plan.week).toEqual({ week_id: 0, year: 2025, week_number: 5 });
    expect(plan.shifts.every((shift) => shift.assigned_staff.length === 0)).toBe(true);
    expect(ShiftplanService.getWeek(2025, 5)).toBeNull();
  });
});

describe("weekly plan", () => {
  it("lists every active shift in order with the names of its staff", () => {
    const week = ShiftplanService.getOrCreateWeek(2025, 1);
    ShiftplanService.assignStaff(team.max, team.early, week.week_id);

    const plan = ShiftplanService.getWeeklyPlan(2025, 1);

    expect(plan.week.week_id).toBe(week.week_id);
    expect(plan.pattern_week).toBeGreaterThanOrEqual(1);
    expect(staffNames(2025, 1)).toEqual([
      { shift: "Frühschicht", staff: ["Max Mustermann"] },
      { shift: "Spätschicht", staff: [] },
    ]);
  });
});
