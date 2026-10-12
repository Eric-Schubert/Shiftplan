import { describe, expect, it } from "vitest";
import { nextWeekday, weekendShare } from "../utils/week-dates";

describe("week dates", () => {
  it("moves weekend days to the following Monday", () => {
    expect(nextWeekday("2026-10-09")).toBe("2026-10-09");
    expect(nextWeekday("2026-10-10")).toBe("2026-10-12");
    expect(nextWeekday("2026-10-11")).toBe("2026-10-12");
  });

  it("tells whether a range touches the weekend", () => {
    expect(weekendShare("2026-10-12", "2026-10-16")).toBe("none");
    expect(weekendShare("2026-10-09", "2026-10-12")).toBe("some");
    expect(weekendShare("2026-10-10", "2026-10-11")).toBe("all");
  });
});
