import { afterEach, describe, expect, it, vi } from "vitest";
import { computed, ref } from "vue";
import type { ShiftWithStaff } from "~/types/shiftplan";
import { useShiftCardInteractions } from "~/composables/useShiftCardInteractions";

function shift(id: number, staffIds: number[]): ShiftWithStaff {
  return {
    shift_id: id,
    name: `Shift ${id}`,
    start_time: "06:00",
    end_time: "14:00",
    color: "#000",
    min_staff: 1,
    sort_order: id,
    active: 1,
    assigned_staff: staffIds.map((staffId) => ({ staff_id: staffId, name: `Person ${staffId}`, active: 1 }) as ShiftWithStaff["assigned_staff"][number]),
  } as ShiftWithStaff;
}

function dragEvent() {
  return {
    preventDefault: () => {},
    dataTransfer: { setData: () => {}, setDragImage: () => {}, effectAllowed: "" },
    target: { offsetWidth: 10, offsetHeight: 10 },
  } as unknown as DragEvent;
}

function setup(failOn?: "assign" | "unassign") {
  const calls: string[] = [];
  const authFetch = vi.fn(async (url: string, options: { body: { shift_id: number } }) => {
    const action = url.split("/").at(-1)!;
    calls.push(`${action} ${options.body.shift_id}`);
    if (action === failOn) throw new Error("offline");
  });
  const notify = vi.fn();
  vi.stubGlobal("ref", ref);
  vi.stubGlobal("computed", computed);
  vi.stubGlobal("useDataStore", () => ({ activeStaff: [] }));
  vi.stubGlobal("useAuthFetch", () => ({ authFetch }));
  vi.stubGlobal("useErrorNotices", () => ({ notify }));

  const onUpdated = vi.fn();
  const card = (id: number, staffIds: number[]) =>
    useShiftCardInteractions({ shift: ref(shift(id, staffIds)), year: ref(2026), week: ref(43), onUpdated });
  return { calls, notify, onUpdated, early: card(1, [7]), late: card(2, []) };
}

async function move(cards: ReturnType<typeof setup>) {
  cards.early.onDragStart(dragEvent(), 7, "Person 7");
  await cards.late.onDrop(dragEvent());
}

describe("planner changes on the week plan", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("moves someone by adding them to the new shift before removing them from the old one", async () => {
    const cards = setup();
    await move(cards);
    expect(cards.calls).toEqual(["assign 2", "unassign 1"]);
    expect(cards.onUpdated).toHaveBeenCalledOnce();
    expect(cards.notify).not.toHaveBeenCalled();
  });

  it("keeps the person in the old shift when adding fails, says so and reloads the week", async () => {
    const cards = setup("assign");
    await move(cards);
    expect(cards.calls).toEqual(["assign 2"]);
    expect(cards.notify).toHaveBeenCalledWith(expect.any(Error), "planner.shift.changeFailed");
    expect(cards.onUpdated).toHaveBeenCalledOnce();
  });

  it("reports a failed removal and keeps the assign dialog open after a failed assignment", async () => {
    const cards = setup("assign");
    cards.late.showAssignDialog.value = true;
    await cards.late.assignStaff(7);
    expect(cards.late.showAssignDialog.value).toBe(true);
    expect(cards.late.assigning.value).toBe(false);

    const removal = setup("unassign");
    await removal.early.unassignStaff(7);
    expect(removal.notify).toHaveBeenCalledOnce();
    expect(removal.onUpdated).toHaveBeenCalledOnce();
  });
});
