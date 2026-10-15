import { afterEach, describe, expect, it, vi } from "vitest";
import type { ShiftRequest } from "../types/shift-request";
import { ownRequestAction } from "../utils/request-actions";

const ANNA = 1;
const takenOver: ShiftRequest = {
  request_id: 1,
  kind: "takeover",
  status: "done",
  requester_staff_id: ANNA,
  requester_name: "Anna Weber",
  partner_staff_id: 2,
  partner_name: "Max Mustermann",
  shift_id: 1,
  shift_name: "Früh",
  date_from: "2026-10-08",
  date_to: "2026-10-08",
  message: null,
  created_at: "2026-10-05 08:00:00",
  decided_at: "2026-10-05 09:00:00",
  decided_by: null,
  undo_requested_by: null,
};

describe("actions on own requests", () => {
  const zone = process.env.TZ;
  afterEach(() => {
    vi.useRealTimers();
    if (zone === undefined) delete process.env.TZ;
    else process.env.TZ = zone;
  });

  it("offers an undo until local midnight before the day, not until UTC midnight", () => {
    process.env.TZ = "Europe/Berlin";
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-07T21:30:00Z") });
    const eveningBefore = ownRequestAction(takenOver, ANNA);
    // 22:30 UTC is already 00:30 on Thursday in Berlin.
    vi.setSystemTime(new Date("2026-10-07T22:30:00Z"));

    expect(eveningBefore).toEqual({ label: "Stornieren", action: "request_undo" });
    expect(ownRequestAction(takenOver, ANNA)).toBeNull();
    expect(ownRequestAction({ ...takenOver, undo_requested_by: ANNA }, ANNA)).toEqual({
      label: "Storno zurückziehen",
      action: "decline_undo",
    });
  });
});
