import { describe, expect, it, vi } from "vitest";
import { stubPushRelay } from "./helpers/push-client";
import { webPushMock } from "./helpers/web-push-mock";

vi.mock("web-push", () => webPushMock);
stubPushRelay();

const change = (overrides: Record<string, unknown>) => ({
  year: 2026,
  week: 41,
  shiftName: "Früh",
  shiftOrder: 1,
  staffId: 1,
  staffName: "Anna",
  delta: 1,
  ...overrides,
});

async function messages() {
  vi.resetModules();
  return import("../server/services/push.service");
}

describe("plan change texts", () => {
  it("lists day changes by date, so the earliest days survive shortening", async () => {
    const { buildChangePayload } = await messages();
    const days = ["2026-10-11", "2026-10-07", "2026-10-05", "2026-10-09", "2026-10-06", "2026-10-08"];
    // The queue keeps the raw date; the text adds it in the recipient's language.
    const payload = buildChangePayload(
      days.map((date) => change({ date })),
      "de"
    )!;

    expect(payload.body.split("\n").map((line) => line.split(":")[0])).toEqual([
      "KW 41 · Früh Mo. 05.10.",
      "KW 41 · Früh Di. 06.10.",
      "KW 41 · Früh Mi. 07.10.",
      "KW 41 · Früh Do. 08.10.",
      "… und 2 weitere Änderungen",
    ]);
  });

  it("names a single further change in the singular", async () => {
    const { buildChangePayload } = await messages();
    const changes = Array.from({ length: 5 }, (_, index) => change({ shiftName: `Schicht ${index + 1}`, shiftOrder: index }));

    const lines = buildChangePayload(changes, "de")!.body.split("\n");

    expect(lines).toHaveLength(5);
    expect(lines[4]).toBe("… und 1 weitere Änderung");
  });

  it("shortens app texts to what the relay accepts", async () => {
    const { buildNativeMessages } = await messages();
    const changes = Array.from({ length: 30 }, (_, index) =>
      change({ date: `2026-10-${String(index + 1).padStart(2, "0")}`, shiftName: `Frühschicht Tag ${index + 1}` })
    );

    const [message] = buildNativeMessages(changes, [{ token: "team", staff_id: null, scope: "all", personal: 0 }], "instance");

    expect(message!.body).toHaveLength(480);
    expect(message!.body.endsWith("…")).toBe(true);
  });

  it("keeps the number of relay calls bounded when many people have their own changes", async () => {
    const { buildNativeMessages } = await messages();
    const people = (count: number) => Array.from({ length: count }, (_, index) => index + 1);
    const build = (count: number) =>
      buildNativeMessages(
        people(count).map((staffId) => change({ staffId, shiftName: `Schicht ${staffId}`, week: staffId % 2 ? 41 : 42 })),
        [
          { token: "team", staff_id: null, scope: "all", personal: 0 },
          ...people(count).map((staffId) => ({ token: `mine-${staffId}`, staff_id: staffId, scope: "mine" as const, personal: 1 as const })),
        ],
        "instance"
      );

    const few = build(3);
    const many = build(30);

    expect(few.map((message) => message.body)).toEqual([
      "KW 41: Schicht 1, Schicht 3 · KW 42: Schicht 2",
      "KW 41: Schicht 1",
      "KW 42: Schicht 2",
      "KW 41: Schicht 3",
    ]);
    expect(many.map((message) => [message.title, message.body, message.tokens.length])).toEqual([
      ["Schichtplan geändert", expect.stringMatching(/^KW 41: /), 1],
      ["Deine Schicht hat sich geändert", "Änderungen in KW 41", 15],
      ["Deine Schicht hat sich geändert", "Änderungen in KW 42", 15],
    ]);
    expect(many[2]!.data).toMatchObject({ url: "/?year=2026&week=42", week: "42" });
  });

  it("shares the relay budget between languages", async () => {
    const { buildNativeMessages } = await messages();
    const people = (count: number) => Array.from({ length: count }, (_, index) => index + 1);
    // Odd staff ids use the app in German, even ones in English; each person has their own shift.
    const build = (count: number) =>
      buildNativeMessages(
        people(count).map((staffId) => change({ staffId, shiftName: `Schicht ${staffId}` })),
        people(count).map((staffId) => ({
          token: `mine-${staffId}`,
          staff_id: staffId,
          scope: "mine" as const,
          personal: 1 as const,
          locale: staffId % 2 ? "de" : "en",
        })),
        "instance"
      );

    const eight = build(8);
    const ten = build(10);

    expect(eight.map((message) => message.body)).toEqual([
      "KW 41: Schicht 1",
      "KW 41: Schicht 3",
      "KW 41: Schicht 5",
      "KW 41: Schicht 7",
      "Week 41: Schicht 2",
      "Week 41: Schicht 4",
      "Week 41: Schicht 6",
      "Week 41: Schicht 8",
    ]);
    // Five texts per language would pass a cap per language; together they go over it.
    expect(ten.map((message) => [message.title, message.body, message.tokens.length])).toEqual([
      ["Deine Schicht hat sich geändert", "Änderungen in KW 41", 5],
      ["Your shift has changed", "Changes in Week 41", 5],
    ]);
  });
});
