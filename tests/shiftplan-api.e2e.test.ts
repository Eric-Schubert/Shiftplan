import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApiClient, type ApiClient, type CookieJar } from "./helpers/api-harness";
import { apiRoutes } from "./helpers/routes";

// Year summary is plan data (teamRead); preview and year copy need a planner.
// 2025 has plans in weeks 1 and 2, the rotation starts in week 1/2026 with Anna, then Ben.
let client: ApiClient;
let planner: CookieJar;

beforeAll(async () => {
  client = await createApiClient(
    apiRoutes("auth/login.post.ts", "shiftplan/year-summary.get.ts", "shiftplan/generate-preview.get.ts", "shiftplan/copy-year.post.ts"),
    (db) => {
      db.prepare("INSERT INTO staff (name) VALUES ('Anna Weber'), ('Ben Wagner')").run();
      db.prepare("INSERT INTO shifts (name, start_time, end_time, sort_order) VALUES ('Früh', '06:00', '14:00', 1)").run();
      db.prepare("INSERT INTO weeks (year, week_number) VALUES (2025, 1), (2025, 2), (2025, 3)").run();
      db.prepare("INSERT INTO shift_assignments (week_id, staff_id, shift_id) VALUES (1, 1, 1), (2, 1, 1), (2, 2, 1)").run();
      db.prepare("INSERT INTO rotation_config (cycle_length, start_year, start_week) VALUES (2, 2026, 1)").run();
      db.prepare("INSERT INTO rotation_pattern (pattern_week, staff_id, shift_id) VALUES (1, 1, 1), (2, 2, 1)").run();
    }
  );
  planner = await client.loginAs("planner", "planner1234");
});

afterAll(() => client.close());

describe("year summary", () => {
  it("counts planned weeks and assignments without sign-in", async () => {
    const response = await client.request("GET", "/api/shiftplan/year-summary?year=2025");

    expect(response.status).toBe(200);
    expect(response.json).toEqual({
      year: 2025,
      totalWeeks: 2,
      totalAssignments: 3,
      weeks: [
        { week: 1, assignments: 1 },
        { week: 2, assignments: 2 },
      ],
    });
  });

  it("needs a plausible year", async () => {
    const missing = await client.request("GET", "/api/shiftplan/year-summary");
    const tooEarly = await client.request("GET", "/api/shiftplan/year-summary?year=1999");

    expect([missing.status, tooEarly.status]).toEqual([400, 400]);
  });
});

describe("generation preview", () => {
  it("shows planners which pattern week each week gets and what is planned already", async () => {
    const response = await client.request<any>("GET", "/api/shiftplan/generate-preview?year=2026&week=1&weeks=2", { jar: planner });

    expect(response.status).toBe(200);
    expect(response.json.weeks).toEqual([
      { year: 2026, week: 1, pattern_week: 1, existing_assignments: 0, day_changes: 0 },
      { year: 2026, week: 2, pattern_week: 2, existing_assignments: 0, day_changes: 0 },
    ]);
  });

  it("is for planners only", async () => {
    expect((await client.request("GET", "/api/shiftplan/generate-preview?year=2026&week=1&weeks=2")).status).toBe(401);
  });
});

describe("year copy", () => {
  it("copies the planned weeks of a year into another one", async () => {
    const response = await client.request<any>("POST", "/api/shiftplan/copy-year", {
      jar: planner,
      csrf: true,
      body: { sourceYear: 2025, targetYear: 2027 },
    });
    const copied = await client.request<any>("GET", "/api/shiftplan/year-summary?year=2027");

    expect(response.status).toBe(200);
    expect(response.json).toMatchObject({ sourceYear: 2025, targetYear: 2027, copiedWeeks: 2, copiedAssignments: 3 });
    expect(copied.json.weeks).toEqual([
      { week: 1, assignments: 1 },
      { week: 2, assignments: 2 },
    ]);
  });

  it("refuses a copy without a planner session or onto the same year", async () => {
    const body = { sourceYear: 2025, targetYear: 2028 };
    const anonymous = await client.request("POST", "/api/shiftplan/copy-year", { body });
    const sameYear = await client.request("POST", "/api/shiftplan/copy-year", { jar: planner, csrf: true, body: { ...body, targetYear: 2025 } });

    expect([anonymous.status, sameYear.status]).toEqual([401, 400]);
    expect((await client.request<any>("GET", "/api/shiftplan/year-summary?year=2028")).json.totalWeeks).toBe(0);
  });
});
