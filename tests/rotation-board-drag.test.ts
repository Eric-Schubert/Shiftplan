import { afterEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import type { RotationTransferPayload } from "~/types/rotation";
import { useRotationPatternDragDrop } from "~/composables/useRotationPatternDragDrop";

function setup(failOn?: "assign" | "unassign") {
  const calls: string[] = [];
  const store = {
    assignToRotation: vi.fn(async (week: number, _staffId: number, shiftId: number) => {
      calls.push(`assign ${week}/${shiftId}`);
      if (failOn === "assign") throw new Error("offline");
    }),
    unassignFromRotation: vi.fn(async (week: number, _staffId: number, shiftId: number) => {
      calls.push(`unassign ${week}/${shiftId}`);
      if (failOn === "unassign") throw new Error("offline");
    }),
    fetchRotation: vi.fn(async () => {}),
  };
  const notify = vi.fn();
  vi.stubGlobal("ref", ref);
  vi.stubGlobal("useDataStore", () => store);
  vi.stubGlobal("useErrorNotices", () => ({ notify }));
  return { calls, store, notify, board: useRotationPatternDragDrop() };
}

function drop(payload: RotationTransferPayload | string) {
  const data = typeof payload === "string" ? payload : JSON.stringify(payload);
  return { preventDefault: () => {}, dataTransfer: { getData: () => data } } as unknown as DragEvent;
}

const fromWeek1Early: RotationTransferPayload = { staffId: 7, staffName: "Anna", source: "rotation", sourcePatternWeek: 1, sourceShiftId: 1 };

describe("rotation board drag and drop", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("moves a chip by adding it to the new cell before removing it from the old one", async () => {
    const { calls, board } = setup();
    await board.onDrop({ event: drop(fromWeek1Early), patternWeek: 2, shiftId: 3 });
    expect(calls).toEqual(["assign 2/3", "unassign 1/1"]);
  });

  it("leaves a failed move visible: the person stays in the old cell, the board reloads and says so", async () => {
    const { calls, store, notify, board } = setup("assign");
    await board.onDrop({ event: drop(fromWeek1Early), patternWeek: 1, shiftId: 2 });
    expect(calls).toEqual(["assign 1/2"]);
    expect(store.fetchRotation).toHaveBeenCalledOnce();
    expect(notify).toHaveBeenCalledWith(expect.any(Error), "settings.saveFailed");
  });

  it("ignores drops onto the same cell and data dragged in from elsewhere", async () => {
    const { calls, board } = setup();
    await board.onDrop({ event: drop(fromWeek1Early), patternWeek: 1, shiftId: 1 });
    await board.onDrop({ event: drop("not json"), patternWeek: 1, shiftId: 2 });
    expect(calls).toEqual([]);
  });

  it("drops the highlight when the drag leaves the window or ends without a drop", () => {
    const { board } = setup();
    const cell = { event: { preventDefault: () => {}, relatedTarget: null, currentTarget: {} } as unknown as DragEvent, patternWeek: 1, shiftId: 2 };

    board.onDragOver(cell);
    board.onDragLeave(cell);
    expect(board.dragOverTarget.value).toBeNull();

    board.onDragOver(cell);
    board.onDragEnd();
    expect(board.dragOverTarget.value).toBeNull();
  });
});
