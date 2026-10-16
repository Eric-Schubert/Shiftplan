import { beforeEach, describe, expect, it, vi } from "vitest";
import { RotationService } from "~/server/services/rotation.service";
import { StaffService } from "~/server/services/staff.service";
import backendConfig from "../config/backend.config.json";
import { closeDatabase } from "./helpers/memory-database";
import { seedTeam, type Team } from "./helpers/service-team";

vi.mock("~/server/utils/database", () => import("./helpers/memory-database"));

let team: Team;

/** Staff ids per shift in one pattern week. */
function pattern(patternWeek: number) {
  return RotationService.getPatternForWeek(patternWeek).assignments.map((entry) => entry.staff.map((staff) => staff.staff_id));
}

beforeEach(() => {
  closeDatabase();
  team = seedTeam();
});

describe("rotation config", () => {
  it("starts with the configured cycle on first read", () => {
    expect(RotationService.getConfig()).toMatchObject({
      cycle_length: backendConfig.rotation.defaultCycleLength,
      start_week: backendConfig.rotation.defaultStartWeek,
    });
  });

  it("changes the cycle length and keeps the start", () => {
    const before = RotationService.getConfig();
    const after = RotationService.updateConfig({ cycle_length: 6 });

    expect(after).toEqual({ ...before, cycle_length: 6 });
    expect(RotationService.getConfig()).toEqual(after);
  });
});

describe("rotation pattern", () => {
  it("assigns a person to a shift in a pattern week", () => {
    expect(RotationService.assignToPattern(1, team.max, team.early)).toBe(true);

    expect(pattern(1)).toEqual([[team.max], []]);
  });

  it("keeps one entry per person, shift and pattern week", () => {
    RotationService.assignToPattern(1, team.max, team.early);
    RotationService.assignToPattern(1, team.max, team.early);

    expect(pattern(1)).toEqual([[team.max], []]);
  });

  it("lets the same person work in several pattern weeks", () => {
    RotationService.assignToPattern(1, team.max, team.early);
    RotationService.assignToPattern(2, team.max, team.early);

    expect(pattern(1)).toEqual([[team.max], []]);
    expect(pattern(2)).toEqual([[team.max], []]);
  });

  it("refuses pattern weeks outside the cycle", () => {
    expect(RotationService.assignToPattern(0, team.max, team.early)).toBe(false);
    expect(RotationService.assignToPattern(5, team.max, team.early)).toBe(false);
    expect(RotationService.getFullPattern().weeks).toHaveLength(4);
  });

  it("returns the pattern of one week", () => {
    RotationService.assignToPattern(1, team.max, team.early);
    RotationService.assignToPattern(1, team.erika, team.late);
    RotationService.assignToPattern(2, team.max, team.late);

    expect(pattern(1)).toEqual([[team.max], [team.erika]]);
    expect(pattern(2)).toEqual([[], [team.max]]);
  });

  it("removes a person from the pattern", () => {
    RotationService.assignToPattern(1, team.max, team.early);

    expect(RotationService.unassignFromPattern(1, team.max, team.early)).toBe(true);
    expect(RotationService.unassignFromPattern(1, team.max, team.early)).toBe(false);
    expect(pattern(1)).toEqual([[], []]);
  });

  it("leaves inactive staff out of the pattern", () => {
    RotationService.assignToPattern(1, team.max, team.early);
    RotationService.assignToPattern(1, team.erika, team.early);
    StaffService.update(team.erika, { active: 0 });

    expect(pattern(1)).toEqual([[team.max], []]);
  });
});

describe("pattern week of a calendar week", () => {
  it("counts from the stored start, also before it and across the year", () => {
    RotationService.updateConfig({ cycle_length: 4, start_year: 2025, start_week: 10 });
    const patternWeek = (year: number, week: number) => RotationService.calculatePatternWeek(year, week);

    expect([10, 11, 12, 13, 14].map((week) => patternWeek(2025, week))).toEqual([1, 2, 3, 4, 1]);
    expect([9, 8, 6].map((week) => patternWeek(2025, week))).toEqual([4, 3, 1]);
    expect(patternWeek(2026, 1)).toBe(4);
  });
});
