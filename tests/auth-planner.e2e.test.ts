import { describe, expect, it } from "vitest";
import { client, useAuthClient } from "./helpers/auth-client";

useAuthClient();

describe("auth and planner e2e", () => {
  it("keeps public reads open while blocking unauthenticated mutations", async () => {
    const publicPlan = await client.request<{
      week: { week_id: number; year: number; week_number: number };
    }>("GET", "/api/shiftplan?year=2026&week=12");
    const weekCount = client.mainDb
      .prepare("SELECT COUNT(*) AS count FROM weeks")
      .get() as { count: number };
    const mutation = await client.request("POST", "/api/shiftplan/assign", {
      body: { staff_id: 1, shift_id: 1, year: 2026, week: 12 },
    });

    expect(publicPlan.status).toBe(200);
    expect(publicPlan.json?.week).toMatchObject({
      week_id: 0,
      year: 2026,
      week_number: 12,
    });
    expect(weekCount.count).toBe(0);
    expect(mutation.status).toBe(401);
  });

  it("allows planner shift assignments but blocks admin-only endpoints", async () => {
    const jar = await client.loginAs("planner", "planner1234");

    const forbiddenStaffCreate = await client.request("POST", "/api/staff", {
      jar,
      csrf: true,
      body: { name: "Should Not Exist", active: 1, is_parttime: 0 },
    });
    const assign = await client.request("POST", "/api/shiftplan/assign", {
      jar,
      csrf: true,
      body: { staff_id: 1, shift_id: 1, year: 2026, week: 14 },
    });
    const assigned = client.mainDb
      .prepare(`
        SELECT COUNT(*) AS count
        FROM shift_assignments sa
        JOIN weeks w ON w.week_id = sa.week_id
        WHERE sa.staff_id = 1 AND sa.shift_id = 1 AND w.year = 2026 AND w.week_number = 14
      `)
      .get() as { count: number };
    const publicPlan = await client.request<{
      shifts: Array<{ assigned_staff: Array<{ name: string }> }>;
    }>("GET", "/api/shiftplan?year=2026&week=14");
    const unassign = await client.request("POST", "/api/shiftplan/unassign", {
      jar,
      csrf: true,
      body: { staff_id: 1, shift_id: 1, year: 2026, week: 14 },
    });
    const remaining = client.mainDb
      .prepare("SELECT COUNT(*) AS count FROM shift_assignments")
      .get() as { count: number };
    const auditEntries = client.mainDb
      .prepare(`
        SELECT username, action, year, week_number, shift_name, staff_name
        FROM audit_log
        ORDER BY audit_id ASC
      `)
      .all();

    expect(forbiddenStaffCreate.status).toBe(403);
    expect(assign.status).toBe(200);
    expect(assign.json).toEqual({ success: true });
    expect(assigned.count).toBe(1);
    expect(publicPlan.status).toBe(200);
    expect(publicPlan.json?.shifts[0]?.assigned_staff).toEqual([
      expect.objectContaining({ name: "Planner Test Staff" }),
    ]);
    expect(unassign.status).toBe(200);
    expect(unassign.json).toEqual({ success: true });
    expect(remaining.count).toBe(0);
    expect(auditEntries).toEqual([
      {
        username: "planner",
        action: "assign",
        year: 2026,
        week_number: 14,
        shift_name: "Planner Test Shift",
        staff_name: "Planner Test Staff",
      },
      {
        username: "planner",
        action: "unassign",
        year: 2026,
        week_number: 14,
        shift_name: "Planner Test Shift",
        staff_name: "Planner Test Staff",
      },
    ]);
  });
});
