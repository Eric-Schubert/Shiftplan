import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Week } from "~/types/shiftplan";
import { ShiftplanService } from "~/server/services/shiftplan.service";
import { StaffService } from "~/server/services/staff.service";
import { closeDatabase } from "./helpers/memory-database";
import { seedTeam, type Team } from "./helpers/service-team";

vi.mock("~/server/utils/database", () => import("./helpers/memory-database"));

let team: Team;
let week: Week;

function assigned(shiftId: number) {
  const shift = ShiftplanService.getWeeklyPlan(2025, 1).shifts.find((entry) => entry.shift_id === shiftId)!;
  return shift.assigned_staff.map((staff) => staff.staff_id);
}

beforeEach(() => {
  closeDatabase();
  team = seedTeam();
  week = ShiftplanService.getOrCreateWeek(2025, 1);
});

describe("shift assignments", () => {
  it("assigns a person to a shift in a week", () => {
    expect(ShiftplanService.assignStaff(team.max, team.early, week.week_id)).toBe(true);

    expect(ShiftplanService.hasAssignment(team.max, team.early, week.week_id)).toBe(true);
    expect(assigned(team.early)).toEqual([team.max]);
  });

  it("keeps one assignment per person, shift and week", () => {
    ShiftplanService.assignStaff(team.max, team.early, week.week_id);
    ShiftplanService.assignStaff(team.max, team.early, week.week_id);

    expect(assigned(team.early)).toEqual([team.max]);
  });

  it("lets the same person work two shifts", () => {
    ShiftplanService.assignStaff(team.max, team.early, week.week_id);
    ShiftplanService.assignStaff(team.max, team.late, week.week_id);

    expect(assigned(team.early)).toEqual([team.max]);
    expect(assigned(team.late)).toEqual([team.max]);
  });

  it("lists all assignments of the week and none of another week", () => {
    ShiftplanService.assignStaff(team.max, team.early, week.week_id);
    ShiftplanService.assignStaff(team.erika, team.early, week.week_id);
    ShiftplanService.assignStaff(team.hans, team.late, week.week_id);

    expect(assigned(team.early).sort()).toEqual([team.max, team.erika].sort());
    expect(assigned(team.late)).toEqual([team.hans]);
    expect(ShiftplanService.getWeeklyPlan(2025, 2).shifts.flatMap((shift) => shift.assigned_staff)).toEqual([]);
  });

  it("unassigns a person and reports when there was nothing to remove", () => {
    ShiftplanService.assignStaff(team.max, team.early, week.week_id);

    expect(ShiftplanService.unassignStaff(team.max, team.early, week.week_id)).toBe(true);
    expect(ShiftplanService.unassignStaff(team.max, team.early, week.week_id)).toBe(false);
    expect(ShiftplanService.hasAssignment(team.max, team.early, week.week_id)).toBe(false);
  });

  it("drops the assignments of a person who is deleted", () => {
    ShiftplanService.assignStaff(team.hans, team.late, week.week_id);

    expect(StaffService.delete(team.hans)).toBe(true);
    expect(assigned(team.late)).toEqual([]);
  });
});
