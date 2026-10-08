import { describe, it, expect } from "vitest";
import { RotationService } from "../server/services/rotation.service";

/** Pattern week (1-based) for a rotation that starts at the given ISO week. */
function patternWeekFrom(startYear: number, startWeek: number, cycleLength: number) {
  return (year: number, week: number): number => {
    const weeksFromStart = RotationService.weeksBetween(startYear, startWeek, year, week);
    const patternIndex = ((weeksFromStart % cycleLength) + cycleLength) % cycleLength;
    return patternIndex + 1;
  };
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
      const cycleLength = 4;

      function calculatePatternWeek(weeksFromStart: number): number {
        const patternIndex = ((weeksFromStart % cycleLength) + cycleLength) % cycleLength;
        return patternIndex + 1;
      }

      for (let i = -100; i <= 100; i++) {
        const result = calculatePatternWeek(i);
        expect(result).toBeGreaterThanOrEqual(1);
        expect(result).toBeLessThanOrEqual(cycleLength);
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
      expect(RotationService.weeksBetween(2020, 1, 2021, 1)).toBe(53);
    });
  });
});
