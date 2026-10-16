import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApiClient, type ApiClient, type CookieJar } from "./helpers/api-harness";
import { apiRoutes } from "./helpers/routes";

// Staff and shift lists are plan data (teamRead in route-policy.ts); editing a shift is for admins.
let client: ApiClient;
let admin: CookieJar;

beforeAll(async () => {
  client = await createApiClient(
    apiRoutes("auth/login.post.ts", "team-access/index.post.ts", "staff/index.get.ts", "shift/index.get.ts", "shift/[id].patch.ts"),
    (db) => {
      db.prepare("INSERT INTO staff (name) VALUES ('Anna Weber'), ('Ben Wagner')").run();
      db.prepare("INSERT INTO shifts (name, start_time, end_time, sort_order) VALUES ('Früh', '06:00', '14:00', 1), ('Spät', '14:00', '22:00', 2)").run();
    }
  );
  admin = await client.loginAs("admin", "admin1234");
});

afterAll(() => client.close());

const names = (response: { json: any }) => response.json.map((entry: { name: string }) => entry.name);

describe("staff and shift lists", () => {
  it("are readable without sign-in while no team code is set", async () => {
    const staff = await client.request("GET", "/api/staff");
    const shifts = await client.request("GET", "/api/shift");

    expect([staff.status, shifts.status]).toEqual([200, 200]);
    expect(names(staff)).toEqual(expect.arrayContaining(["Anna Weber", "Ben Wagner"]));
    expect(names(shifts)).toEqual(["Früh", "Spät"]);
  });

  it("need the team code, a sign-in or a planner once a code is set", async () => {
    await client.request("POST", "/api/team-access", { jar: admin, csrf: true, body: { generate: true } });
    const staff = await client.request("GET", "/api/staff");
    const shifts = await client.request("GET", "/api/shift");
    const asAdmin = await client.request("GET", "/api/shift", { jar: admin });
    await client.request("POST", "/api/team-access", { jar: admin, csrf: true, body: { code: null } });

    expect([staff.status, shifts.status, asAdmin.status]).toEqual([401, 401, 200]);
  });
});

describe("shift editing", () => {
  it("lets admins change a shift", async () => {
    const response = await client.request<any>("PATCH", "/api/shift/2", {
      jar: admin,
      csrf: true,
      body: { name: "Spätdienst", start_time: "13:30", min_staff: 3 },
    });

    expect(response.status).toBe(200);
    expect(response.json).toMatchObject({ shift_id: 2, name: "Spätdienst", start_time: "13:30", end_time: "22:00", min_staff: 3 });
    expect(names(await client.request("GET", "/api/shift"))).toEqual(["Früh", "Spätdienst"]);
  });

  it("is not for planners and needs an existing shift", async () => {
    const planner = await client.loginAs("planner", "planner1234");
    const asPlanner = await client.request("PATCH", "/api/shift/1", { jar: planner, csrf: true, body: { name: "Frühdienst" } });
    const unknown = await client.request("PATCH", "/api/shift/99", { jar: admin, csrf: true, body: { name: "Nacht" } });

    expect([asPlanner.status, unknown.status]).toEqual([403, 404]);
    expect(names(await client.request("GET", "/api/shift"))[0]).toBe("Früh");
  });
});
