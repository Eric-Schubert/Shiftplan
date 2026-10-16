import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick, ref } from "vue";
import { useWeekPreviewData } from "~/composables/useWeekPreviewData";

type Query = { query: { year: number; week: number } };

/** $fetch whose answers the test releases one by one, in any order. */
function controlledFetch() {
  const pending: Array<{ week: number; resolve: (value: unknown) => void; reject: (error: Error) => void }> = [];
  const fetch = vi.fn((_url: string, { query }: Query) => new Promise((resolve, reject) => pending.push({ week: query.week, resolve, reject })));
  vi.stubGlobal("$fetch", fetch);
  return { fetch, pending };
}

const plan = (week: number) => ({ week: { week_id: week, year: 2026, week_number: week }, shifts: [] });
const weeksFrom = (start: number) => [start, start + 1].map((week) => ({ year: 2026, week }));

describe("preview of the next weeks", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("keeps the newest selection when an older answer arrives last", async () => {
    const { pending } = controlledFetch();
    const weeks = ref(weeksFrom(43));
    const { plans, loading } = useWeekPreviewData(weeks, ref(0));

    weeks.value = weeksFrom(45);
    await nextTick();
    for (const request of pending.filter((entry) => entry.week >= 45)) request.resolve(plan(request.week));
    await vi.waitFor(() => expect(Object.keys(plans.value)).toEqual(["2026-45", "2026-46"]));

    for (const request of pending.filter((entry) => entry.week < 45)) request.resolve(plan(request.week));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(Object.keys(plans.value)).toEqual(["2026-45", "2026-46"]);
    expect(loading.value).toBe(false);
  });

  it("marks a week that failed to load instead of showing it as not planned", async () => {
    const { pending } = controlledFetch();
    const { plans } = useWeekPreviewData(ref(weeksFrom(43)), ref(0));
    pending[0]!.resolve(plan(43));
    pending[1]!.reject(new Error("offline"));
    await vi.waitFor(() => expect(plans.value["2026-44"]).toBe("failed"));
    expect(plans.value["2026-43"]).toMatchObject({ week: { week_number: 43 } });
  });

  it("reloads after a saved change without hiding the cards", async () => {
    const { fetch, pending } = controlledFetch();
    const revision = ref(0);
    const { loading } = useWeekPreviewData(ref(weeksFrom(43)), revision);
    for (const request of pending.splice(0)) request.resolve(plan(request.week));
    await vi.waitFor(() => expect(loading.value).toBe(false));

    revision.value++;
    await nextTick();
    expect(fetch).toHaveBeenCalledTimes(4);
    expect(loading.value).toBe(false);
  });
});
