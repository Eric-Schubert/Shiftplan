import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useDataStore } from "~/stores/data.store";
import { updateStaffRecord } from "~/stores/data/staff";
import { updateShiftRecord } from "~/stores/data/shifts";
import { holidayWeekEntry, cachedHolidayWeeks } from "~/composables/useHolidayWeek";

describe("planner data", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.stubGlobal("useAuthStore", () => ({ csrfToken: "token" }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("keeps a failed first load as an error the layout can retry, without throwing", async () => {
    vi.stubGlobal("$fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const store = useDataStore();
    await expect(store.init()).resolves.toBe(false);
    expect(store.loadError).toBe(true);

    vi.stubGlobal("$fetch", vi.fn().mockResolvedValue([]));
    await expect(store.init()).resolves.toBe(true);
    expect(store.loadError).toBe(false);
  });

  it("reloads the rotation board after any staff or shift edit, as it shows their names and colours", async () => {
    const fetchRotation = vi.fn(async () => {});
    vi.stubGlobal(
      "$fetch",
      vi.fn(async (_url: string, options: { body: object }) => ({ ...options.body, id: 1 }))
    );

    await updateStaffRecord({ staff: [], loadingStaff: false, fetchRotation, getStaffById: () => undefined }, 1, { name: "Anna" });
    await updateShiftRecord({ shifts: [], loadingShifts: false, fetchRotation, getShiftById: () => undefined }, 1, { color: "#f00" });
    expect(fetchRotation).toHaveBeenCalledTimes(2);
  });
});

describe("holiday cache", () => {
  it("is not filled while the server renders deep-linked weeks", () => {
    const before = cachedHolidayWeeks().length;
    for (let year = 2000; year < 2010; year++) holidayWeekEntry(`${year}-1`, true);
    expect(cachedHolidayWeeks()).toHaveLength(before);

    holidayWeekEntry("2026-43", false);
    expect(cachedHolidayWeeks()).toContain("2026-43");
  });
});
