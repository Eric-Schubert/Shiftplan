import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createApiClient, type ApiClient } from "./helpers/api-harness";
import { apiRoutes } from "./helpers/routes";

// Holidays are public reads (route-policy.ts publicReadPrefixes): open even behind a team code.
// The OpenHolidays API is the only stub; everything after fetch is real.
const newYear = (year: string) => ({
  startDate: `${year}-01-01`,
  endDate: `${year}-01-01`,
  type: "Public",
  nationwide: true,
  name: [{ language: "DE", text: "Neujahr" }],
});
const WINTER = { startDate: "2026-02-09", endDate: "2026-02-21", type: "School", name: [{ language: "DE", text: "Winterferien" }] };

let client: ApiClient;
const requests: URL[] = [];

beforeAll(async () => {
  vi.stubGlobal("fetch", async (input: string) => {
    const url = new URL(input);
    requests.push(url);
    const year = url.searchParams.get("validFrom")!.slice(0, 4);
    return new Response(JSON.stringify(url.pathname.endsWith("SchoolHolidays") ? [WINTER] : [newYear(year)]), { status: 200 });
  });
  client = await createApiClient(apiRoutes("auth/login.post.ts", "team-access/index.post.ts", "holidays/public.get.ts", "holidays/school.get.ts"));
  const admin = await client.loginAs("admin", "admin1234");
  await client.request("POST", "/api/team-access", { jar: admin, csrf: true, body: { generate: true } });
});

afterAll(() => {
  client.close();
  vi.unstubAllGlobals();
});

describe("holiday API", () => {
  it("lists public holidays of a year and of one week without any sign-in", async () => {
    const year = await client.request<any[]>("GET", "/api/holidays/public?year=2026");
    const firstWeek = await client.request<any[]>("GET", "/api/holidays/public?year=2026&week=1");
    const thirdWeek = await client.request<any[]>("GET", "/api/holidays/public?year=2026&week=3");

    expect(year.status).toBe(200);
    expect(year.json).toEqual([{ date: "2026-01-01", name: "Neujahr", type: "national", nationwide: true, states: [] }]);
    expect(firstWeek.json!.map((holiday) => holiday.date)).toEqual(["2026-01-01"]);
    expect(thirdWeek.json).toEqual([]);
  });

  it("lists school holidays of the configured states", async () => {
    const response = await client.request<any>("GET", "/api/holidays/school?year=2026");

    expect(response.status).toBe(200);
    expect(response.json.holidays).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "Winterferien", start: "2026-02-09", end: "2026-02-21" })])
    );
    expect(requests.some((url) => url.pathname.endsWith("SchoolHolidays"))).toBe(true);
  });

  it("needs a year", async () => {
    const publicHolidays = await client.request("GET", "/api/holidays/public");
    const schoolHolidays = await client.request("GET", "/api/holidays/school?year=abc");

    expect([publicHolidays.status, schoolHolidays.status]).toEqual([400, 400]);
  });
});
