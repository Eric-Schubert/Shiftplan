import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient, type ApiClient, type CookieJar } from "./helpers/api-harness";

let client: ApiClient;
let planner: CookieJar;

beforeEach(async () => {
  client = await createApiClient(
    [
      ["post", "/api/auth/login", "server/api/auth/login.post"],
      ["get", "/api/shiftplan", "server/api/shiftplan/index.get"],
      ["post", "/api/shiftplan/assign", "server/api/shiftplan/assign.post"],
      ["post", "/api/shiftplan/copy-year", "server/api/shiftplan/copy-year.post"],
      ["patch", "/api/rotation/config", "server/api/rotation/config.patch"],
    ],
    (db) => {
      db.prepare("INSERT INTO staff (name, active, is_parttime) VALUES ('Anna Weber', 1, 0), ('Ben Alt', 0, 0)").run();
      db.prepare("INSERT INTO shifts (name, active, start_time, end_time) VALUES ('Früh', 1, '06:00', '14:00'), ('Saison', 0, '14:00', '22:00')").run();
      db.prepare("INSERT INTO rotation_config (cycle_length, start_year, start_week) VALUES (2, 2026, 1)").run();
    }
  );
  planner = await client.loginAs("planner", "planner1234");
});

afterEach(() => {
  client.close();
  vi.useRealTimers();
});

function addAssignments(year: number, week: number, pairs: Array<[number, number]>) {
  const { lastInsertRowid } = client.mainDb.prepare("INSERT INTO weeks (year, week_number) VALUES (?, ?)").run(year, week);
  for (const [staffId, shiftId] of pairs) {
    client.mainDb.prepare("INSERT INTO shift_assignments (staff_id, shift_id, week_id) VALUES (?, ?, ?)").run(staffId, shiftId, lastInsertRowid);
  }
}

describe("week 53", () => {
  it("exists only in 53-week years", async () => {
    const body = (year: number) => ({ staff_id: 1, shift_id: 1, year, week: 53 });
    const in2025 = await client.request("POST", "/api/shiftplan/assign", { jar: planner, csrf: true, body: body(2025) });
    const in2026 = await client.request("POST", "/api/shiftplan/assign", { jar: planner, csrf: true, body: body(2026) });

    expect(in2025.status).toBe(400);
    expect(in2025.json?.data?.code).toBe("errors.shiftplan.noSuchWeek");
    expect(in2026.status).toBe(200);
    expect(client.mainDb.prepare("SELECT year FROM weeks WHERE week_number = 53").all()).toEqual([{ year: 2026 }]);
  });

  it("is refused as rotation start week of a 52-week year, also when only the year changes", async () => {
    const week = await client.request("PATCH", "/api/rotation/config", { jar: planner, csrf: true, body: { start_year: 2027, start_week: 53 } });
    const ok = await client.request("PATCH", "/api/rotation/config", { jar: planner, csrf: true, body: { start_week: 53 } });
    const year = await client.request("PATCH", "/api/rotation/config", { jar: planner, csrf: true, body: { start_year: 2027 } });

    expect(week.status).toBe(400);
    expect(ok.status).toBe(200);
    expect(year.status).toBe(400);
    expect(year.json?.data?.code).toBe("errors.shiftplan.noSuchWeek");
  });
});

describe("GET /api/shiftplan without year and week", () => {
  it.each([
    ["2025-12-30T10:00:00Z", 2026, 1],
    ["2027-01-01T10:00:00Z", 2026, 53],
    // Monday 00:30 in Berlin is still Sunday in UTC.
    ["2026-10-11T22:30:00Z", 2026, 42],
  ])("at %s answers week %i/%i of the planning time zone", async (now, year, week) => {
    vi.useFakeTimers({ toFake: ["Date"], now: new Date(now) });
    const response = await client.request("GET", "/api/shiftplan", { jar: planner });

    expect(response.status).toBe(200);
    expect(response.json?.week).toMatchObject({ year, week_number: week });
  });
});

describe("copy-year", () => {
  it("copies active staff and shifts only, drops week 53 for a 52-week year and writes one audit entry", async () => {
    addAssignments(2026, 1, [
      [1, 1],
      [2, 1],
      [1, 2],
    ]);
    addAssignments(2026, 53, [[1, 1]]);

    const response = await client.request("POST", "/api/shiftplan/copy-year", { jar: planner, csrf: true, body: { sourceYear: 2026, targetYear: 2027 } });
    const copied = client.mainDb
      .prepare(
        "SELECT w.year, w.week_number, sa.staff_id, sa.shift_id FROM shift_assignments sa JOIN weeks w ON w.week_id = sa.week_id WHERE w.year = 2027"
      )
      .all();
    const audit = client.mainDb.prepare("SELECT action, year, week_number, reason, reason_key FROM audit_log").all();

    expect(response.status).toBe(200);
    expect(response.json).toMatchObject({ copiedWeeks: 1, missingWeeks: 1, copiedAssignments: 1, inactiveAssignments: 2, skippedWeeks: 0 });
    expect(copied).toEqual([{ year: 2027, week_number: 1, staff_id: 1, shift_id: 1 }]);
    expect(client.mainDb.prepare("SELECT COUNT(*) AS count FROM weeks WHERE year = 2027 AND week_number = 53").get()).toEqual({ count: 0 });
    expect(audit).toEqual([
      { action: "generate", year: 2027, week_number: 1, reason: "1 Woche aus 2026 nach 2027 kopiert", reason_key: "audit.reason.yearCopied" },
    ]);
  });

  it("names overwritten weeks in the audit entry", async () => {
    addAssignments(2026, 2, [[1, 1]]);
    addAssignments(2027, 2, [[2, 1]]);

    const response = await client.request("POST", "/api/shiftplan/copy-year", {
      jar: planner,
      csrf: true,
      body: { sourceYear: 2026, targetYear: 2027, overwrite: true },
    });

    expect(response.json).toMatchObject({ copiedWeeks: 1, overwrittenWeeks: 1 });
    expect(client.mainDb.prepare("SELECT reason_key FROM audit_log").get()).toEqual({ reason_key: "audit.reason.yearCopiedOverwritten" });
  });
});
