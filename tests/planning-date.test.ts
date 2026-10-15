import { describe, expect, it } from "vitest";
import { planningToday } from "../server/utils/planning-date";

describe("planning date", () => {
  it("turns to the next day at midnight in the planning time zone", () => {
    expect(planningToday(new Date("2026-10-07T21:59:00Z"))).toBe("2026-10-07");
    // Summer time in Berlin is two hours ahead of UTC, winter time one.
    expect(planningToday(new Date("2026-10-07T22:30:00Z"))).toBe("2026-10-08");
    expect(planningToday(new Date("2026-12-31T23:30:00Z"))).toBe("2027-01-01");
  });
});
