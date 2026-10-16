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
    const labels: Record<string, string> = {
      "2026-10-05": "Mo. 05.10.",
      "2026-10-06": "Di. 06.10.",
      "2026-10-07": "Mi. 07.10.",
      "2026-10-08": "Do. 08.10.",
      "2026-10-09": "Fr. 09.10.",
      "2026-10-11": "So. 11.10.",
    };
    const payload = buildChangePayload(days.map((date) => change({ date, shiftName: `Früh ${labels[date]}` })), "de-DE")!;

    expect(payload.body.split("\n").map((line) => line.split(":")[0])).toEqual([
      "KW 41 · Früh Mo. 05.10.",
      "KW 41 · Früh Di. 06.10.",
      "KW 41 · Früh Mi. 07.10.",
      "KW 41 · Früh Do. 08.10.",
      "… und 2 weitere Änderungen",
    ]);
  });

  it("shortens app texts to what the relay accepts", async () => {
    const { buildNativeMessages } = await messages();
    const changes = Array.from({ length: 30 }, (_, index) =>
      change({ date: `2026-10-${String(index + 1).padStart(2, "0")}`, shiftName: `Frühschicht Tag ${index + 1}` })
    );

    const [message] = buildNativeMessages(changes, [{ token: "team", staff_id: null, scope: "all", personal: 0 }], "instance", "de-DE");

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
        "instance",
        "de-DE"
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
});
