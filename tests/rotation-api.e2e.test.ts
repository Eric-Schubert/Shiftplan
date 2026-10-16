import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApiClient, type ApiClient, type CookieJar } from "./helpers/api-harness";
import { apiRoutes } from "./helpers/routes";

// GET /api/rotation is plan data (teamRead in route-policy.ts); every write needs a planner session.
let client: ApiClient;
let planner: CookieJar;

const write = (method: string, path: string, body: unknown) => client.request<any>(method, path, { jar: planner, csrf: true, body });

/** Staff names per shift in one pattern week, as the planner board reads them. */
async function patternWeek(week: number): Promise<string[][]> {
  const response = await client.request<any>("GET", "/api/rotation");
  return response.json.weeks[week - 1].assignments.map((entry: any) => entry.staff.map((staff: any) => staff.name));
}

beforeAll(async () => {
  client = await createApiClient(
    apiRoutes(
      "auth/login.post.ts",
      "team-access/index.post.ts",
      "rotation/index.get.ts",
      "rotation/assign.post.ts",
      "rotation/unassign.post.ts",
      "rotation/config.patch.ts",
      "rotation/excel-template.get.ts",
      "rotation/excel-import.post.ts"
    ),
    (db) => {
      db.prepare("INSERT INTO staff (name) VALUES ('Anna Weber'), ('Ben Wagner')").run();
      db.prepare("INSERT INTO shifts (name, start_time, end_time, sort_order) VALUES ('Früh', '06:00', '14:00', 1), ('Spät', '14:00', '22:00', 2)").run();
      db.prepare("INSERT INTO rotation_config (cycle_length, start_year, start_week) VALUES (2, 2026, 1)").run();
      db.prepare("INSERT INTO rotation_pattern (pattern_week, staff_id, shift_id) VALUES (1, 1, 1)").run();
    }
  );
  planner = await client.loginAs("planner", "planner1234");
});

afterAll(() => client.close());

describe("rotation API", () => {
  it("shows the pattern without sign-in while no team code is set", async () => {
    const response = await client.request<any>("GET", "/api/rotation");

    expect(response.status).toBe(200);
    expect(response.json.config).toMatchObject({ cycle_length: 2, start_year: 2026, start_week: 1 });
    expect(await patternWeek(1)).toEqual([["Anna Weber"], []]);
  });

  it("lets planners put people into the pattern and take them out again", async () => {
    const assign = await write("POST", "/api/rotation/assign", { pattern_week: 2, staff_id: 2, shift_id: 2 });
    const assigned = await patternWeek(2);
    const unassign = await write("POST", "/api/rotation/unassign", { pattern_week: 2, staff_id: 2, shift_id: 2 });

    expect([assign.status, unassign.status]).toEqual([200, 200]);
    expect(assigned).toEqual([[], ["Ben Wagner"]]);
    expect(await patternWeek(2)).toEqual([[], []]);
  });

  it("refuses pattern writes without a planner session and weeks beyond the cycle", async () => {
    const anonymous = await client.request("POST", "/api/rotation/assign", { body: { pattern_week: 1, staff_id: 2, shift_id: 1 } });
    const anonymousUnassign = await client.request("POST", "/api/rotation/unassign", { body: { pattern_week: 1, staff_id: 1, shift_id: 1 } });
    const beyondCycle = await write("POST", "/api/rotation/assign", { pattern_week: 3, staff_id: 2, shift_id: 1 });

    expect([anonymous.status, anonymousUnassign.status, beyondCycle.status]).toEqual([401, 401, 400]);
    expect(await patternWeek(1)).toEqual([["Anna Weber"], []]);
  });

  it("changes the cycle, but not without a change or a session", async () => {
    const longer = await write("PATCH", "/api/rotation/config", { cycle_length: 3, start_week: 2 });
    const empty = await write("PATCH", "/api/rotation/config", {});
    const anonymous = await client.request("PATCH", "/api/rotation/config", { body: { cycle_length: 4 } });
    const restored = await write("PATCH", "/api/rotation/config", { cycle_length: 2, start_week: 1 });

    expect(longer.status).toBe(200);
    expect(longer.json).toMatchObject({ cycle_length: 3, start_year: 2026, start_week: 2 });
    expect([empty.status, anonymous.status]).toEqual([400, 401]);
    expect(restored.json).toMatchObject({ cycle_length: 2, start_week: 1 });
  });

  it("checks a filled template in a dry run and needs a file", async () => {
    const template = await client.request("GET", "/api/rotation/excel-template", { jar: planner });
    const file = { filename: "rotation.xlsx", data: Buffer.from(template.body as Uint8Array) };
    const dryRun = await client.request<any>("POST", "/api/rotation/excel-import", { jar: planner, csrf: true, form: { file, dryRun: "1" } });
    const withoutFile = await client.request<any>("POST", "/api/rotation/excel-import", { jar: planner, csrf: true, form: { dryRun: "1" } });

    expect(dryRun.status).toBe(200);
    expect(dryRun.json).toMatchObject({ success: true, dryRun: true, config: { cycle_length: 2 }, importedAssignments: 1 });
    expect(withoutFile.status).toBe(400);
    expect(await patternWeek(1)).toEqual([["Anna Weber"], []]);
  });

  it("hides the pattern behind a team code", async () => {
    const admin = await client.loginAs("admin", "admin1234");
    await client.request("POST", "/api/team-access", { jar: admin, csrf: true, body: { generate: true } });
    const hidden = await client.request("GET", "/api/rotation");
    await client.request("POST", "/api/team-access", { jar: admin, csrf: true, body: { code: null } });

    expect(hidden.status).toBe(401);
    expect((await client.request("GET", "/api/rotation", { jar: planner })).status).toBe(200);
  });
});
