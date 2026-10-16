import { afterEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { ref } from "vue";
import type { Absence } from "~/types/absence";
import type { WeeklyShiftplanWithPattern } from "~/types/shiftplan";
import { createPlannerWeek } from "~/composables/usePlannerWeek";
import { useAppStore } from "~/stores/app.store";

function plan(year: number, week: number, staffIds: number[] = []): WeeklyShiftplanWithPattern {
  return {
    week: { week_id: 1, year, week_number: week },
    pattern_week: 1,
    shifts: [{ shift_id: 1, assigned_staff: staffIds.map((staff_id) => ({ staff_id })) }],
  } as unknown as WeeklyShiftplanWithPattern;
}

function setup(options: { plan?: WeeklyShiftplanWithPattern | null; pending?: boolean; failGenerate?: boolean } = {}) {
  setActivePinia(createPinia());
  useAppStore().setWeek(2026, 43);
  const authFetch = vi.fn(async () => {
    if (options.failGenerate) throw new Error("offline");
  });
  const notify = vi.fn();
  vi.stubGlobal("useAuthFetch", () => ({ authFetch }));
  vi.stubGlobal("useErrorNotices", () => ({ notify }));

  const shiftplan = ref(options.plan === undefined ? plan(2026, 43) : options.plan);
  const pending = ref(options.pending ?? false);
  const refresh = vi.fn(async () => {});
  const refreshAbsences = vi.fn(async () => {});
  const week = createPlannerWeek({ shiftplan, pending, absences: ref<Absence[]>([]), refresh, refreshAbsences });
  return { week, shiftplan, pending, authFetch, notify, refresh, refreshAbsences };
}

describe("the plan page's week", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("shows the skeleton only while the selected week's plan is not there yet", () => {
    const { week, pending, shiftplan } = setup();
    expect(week.showSkeleton.value).toBe(false);

    // A reload after a change keeps the plan visible.
    pending.value = true;
    expect(week.showSkeleton.value).toBe(false);

    // Switching the week shows the skeleton until that week's plan arrives.
    useAppStore().setWeek(2026, 44);
    expect(week.showSkeleton.value).toBe(true);
    shiftplan.value = plan(2026, 44);
    pending.value = false;
    expect(week.showSkeleton.value).toBe(false);
  });

  it("reloads plan and absences together and counts the change for the preview", async () => {
    const { week, refresh, refreshAbsences } = setup();
    await week.refreshWeek();
    expect(refresh).toHaveBeenCalledOnce();
    expect(refreshAbsences).toHaveBeenCalledOnce();
    expect(week.planRevision.value).toBe(1);
  });

  it("fills an empty week at once but asks for one with assignments", async () => {
    const empty = setup();
    empty.week.requestFill();
    expect(empty.week.confirmFill.value).toBe(false);
    expect(empty.authFetch).toHaveBeenCalledOnce();

    const assigned = setup({ plan: plan(2026, 43, [7]) });
    assigned.week.requestFill();
    expect(assigned.week.confirmFill.value).toBe(true);
    expect(assigned.authFetch).not.toHaveBeenCalled();
  });

  it("holds the hero button and asks from elsewhere while the week's plan is unknown", () => {
    const { week } = setup({ pending: true });
    expect(week.fillReady.value).toBe(false);
    expect(week.replacedByFill.value).toBeNull();
    week.requestFill();
    expect(week.confirmFill.value).toBe(true);
  });

  it("posts the selected week, closes the question and reloads, even when filling fails", async () => {
    const { week, authFetch, refresh, notify } = setup();
    week.confirmFill.value = true;
    const running = week.generateFromPattern();
    expect(week.generating.value).toBe(true);
    await running;
    expect(authFetch).toHaveBeenCalledWith("/api/shiftplan/generate", { method: "POST", body: { year: 2026, week: 43 } });
    expect(week.confirmFill.value).toBe(false);
    expect(week.generating.value).toBe(false);
    expect(refresh).toHaveBeenCalledOnce();
    expect(notify).not.toHaveBeenCalled();

    const failing = setup({ failGenerate: true });
    await failing.week.generateFromPattern();
    expect(failing.notify).toHaveBeenCalledWith(expect.any(Error), "planner.week.fill.failed");
    expect(failing.refresh).toHaveBeenCalledOnce();
    expect(failing.week.generating.value).toBe(false);
  });
});
