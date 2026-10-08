import { describe, expect, it, vi } from "vitest";
import { stubPushRelay } from "./helpers/push-client";
import { webPushMock } from "./helpers/web-push-mock";

vi.mock("web-push", () => webPushMock);
stubPushRelay();

describe("push helpers", () => {
  it("treats the turn of the year as current and next week", async () => {
    vi.resetModules();
    const { getNotifiableWeeks } = await import("../server/services/push.service");

    expect(getNotifiableWeeks(new Date("2026-12-30T12:00:00Z"))).toEqual([
      { year: 2026, week: 53 },
      { year: 2027, week: 1 },
    ]);
    expect(getNotifiableWeeks(new Date("2026-10-04T23:30:00Z"))).toEqual([
      { year: 2026, week: 41 },
      { year: 2026, week: 42 },
    ]);
  });

  it("shortens long change lists", async () => {
    vi.resetModules();
    const { buildChangePayload } = await import("../server/services/push.service");
    const changes = Array.from({ length: 6 }, (_, index) => ({
      year: 2026,
      week: 41,
      shiftName: `Schicht ${index + 1}`,
      shiftOrder: index,
      staffId: 1,
      staffName: "Anna",
      delta: 1,
    }));

    const payload = buildChangePayload(changes)!;
    expect(payload.body.split("\n")).toHaveLength(5);
    expect(payload.body).toContain("… und 2 weitere Änderungen");
  });
});
