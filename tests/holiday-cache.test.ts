import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const HOLIDAY = {
  id: "1",
  startDate: "2026-10-03",
  endDate: "2026-10-03",
  type: "Public",
  name: [{ language: "DE", text: "Tag der Deutschen Einheit" }],
  nationwide: true,
};

let fetchMock: ReturnType<typeof vi.fn>;
let answer: () => Promise<Response>;

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-14T08:00:00Z") });
  answer = async () => new Response(JSON.stringify([HOLIDAY]), { status: 200 });
  fetchMock = vi.fn((_url: string, _init?: RequestInit) => answer());
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function service() {
  return (await import("~/server/services/public-holiday.service")).PublicHolidayService;
}

describe("public holiday cache", () => {
  it("asks the API once for parallel requests of the same year, with a timeout", async () => {
    const holidays = await service();
    const [first, second] = await Promise.all([holidays.list(2026, null), holidays.list(2026, null)]);

    expect(first).toEqual(second);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]![1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it("serves the expired answer when the API fails later", async () => {
    const holidays = await service();
    const fresh = await holidays.list(2026, null);
    vi.setSystemTime(new Date("2026-12-24T08:00:00Z"));
    answer = async () => new Response("down", { status: 503 });

    expect(await holidays.list(2026, null)).toEqual(fresh);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("fails when there is no earlier answer to fall back on", async () => {
    const holidays = await service();
    answer = async () => new Response("down", { status: 503 });
    await expect(holidays.list(2026, null)).rejects.toThrow();
  });
});

describe("GET /api/holidays", () => {
  async function call(query: string) {
    const { createApp, toPlainHandler } = await import("h3");
    const handler = (await import("~/server/api/holidays/public.get")).default;
    const app = createApp();
    app.use("/api/holidays", handler);
    const response = await toPlainHandler(app)({ method: "GET", path: `/api/holidays?${query}`, headers: {} });
    return { status: response.status, body: JSON.parse(String(response.body)) };
  }

  it.each(["year=2026abc", "year=99999", "year=2026&week=1e1", "year=2027&week=53"])("refuses %s without asking the API", async (query) => {
    const response = await call(query);
    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("answers 502 without the upstream message when the API is down", async () => {
    answer = async () => new Response("secret upstream detail", { status: 503 });
    const response = await call("year=2026");

    expect(response.status).toBe(502);
    expect(response.body.data.code).toBe("errors.holidays.publicFailed");
    expect(JSON.stringify(response.body)).not.toContain("503");
  });
});
