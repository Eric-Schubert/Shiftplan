import { describe, it, expect } from "vitest";
import { patternWeekFor } from "~/shared/utils/rotation-math";
import { isoWeeksBetween } from "~/shared/utils/week";

/** Pattern week (1-based) for a rotation that starts at the given ISO week. */
function patternWeekFrom(startYear: number, startWeek: number, cycleLength: number) {
  return (year: number, week: number): number => patternWeekFor(cycleLength, { year: startYear, week: startWeek }, year, week);
}

describe("Rotation Operations", () => {
  describe("Pattern Week Calculation", () => {
    it("should calculate correct pattern week for sequential weeks", () => {
      const calculatePatternWeek = patternWeekFrom(2025, 1, 4);

      expect(calculatePatternWeek(2025, 1)).toBe(1);
      expect(calculatePatternWeek(2025, 2)).toBe(2);
      expect(calculatePatternWeek(2025, 4)).toBe(4);
      expect(calculatePatternWeek(2025, 5)).toBe(1);
      expect(calculatePatternWeek(2026, 1)).toBe(1);
      expect(calculatePatternWeek(2026, 2)).toBe(2);
    });

    it("should handle weeks before start date", () => {
      const calculatePatternWeek = patternWeekFrom(2025, 10, 4);

      expect(calculatePatternWeek(2025, 9)).toBe(4);
      expect(calculatePatternWeek(2025, 8)).toBe(3);
      expect(calculatePatternWeek(2025, 6)).toBe(1);
    });

    it("should never return pattern week > cycle length", () => {
      const calculatePatternWeek = patternWeekFrom(2025, 10, 4);

      for (const year of [2023, 2024, 2025, 2026, 2027]) {
        for (let week = 1; week <= 52; week++) {
          const result = calculatePatternWeek(year, week);
          expect(result).toBeGreaterThanOrEqual(1);
          expect(result).toBeLessThanOrEqual(4);
        }
      }
    });

    it("should keep a 6-week rhythm stable after an ISO year with 53 weeks", () => {
      const calculatePatternWeek = patternWeekFrom(2026, 18, 6);

      expect(calculatePatternWeek(2026, 18)).toBe(1);
      expect(calculatePatternWeek(2026, 19)).toBe(2);
      expect(calculatePatternWeek(2026, 20)).toBe(3);
      expect(calculatePatternWeek(2026, 21)).toBe(4);
      expect(calculatePatternWeek(2026, 22)).toBe(5);
      expect(calculatePatternWeek(2026, 23)).toBe(6);
      expect(calculatePatternWeek(2026, 24)).toBe(1);
      expect(calculatePatternWeek(2026, 25)).toBe(2);
    });

    it("should count 53 ISO weeks across 2020 correctly", () => {
      expect(isoWeeksBetween({ year: 2020, week: 1 }, { year: 2021, week: 1 })).toBe(53);
    });
  });
});
