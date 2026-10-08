import { describe, expect, it, vi } from "vitest";
import {
  ANNA,
  EARLY,
  LATE,
  MAX,
  THURSDAY,
  bearer,
  client,
  member,
  staffOn,
  useShiftRequestClient,
} from "./helpers/shift-requests";
import { webPushMock } from "./helpers/web-push-mock";

vi.mock("web-push", () => webPushMock);
useShiftRequestClient();

describe("planner approval", () => {
  it("waits for the planner when approval is required, and the planner can revert", async () => {
    const planner = await client.loginAs("admin", "admin1234");
    const setting = await client.request<any>("POST", "/api/requests/settings", {
      jar: planner,
      csrf: true,
      body: { requiresApproval: true },
    });
    const anna = await member(ANNA, "anna:tok");
    const max = await member(MAX, "max:tok");
    const created = await client.request<any>("POST", "/api/member/requests", {
      headers: bearer(anna),
      body: { kind: "takeover", date: THURSDAY },
    });
    const id = created.json!.request.request_id;

    const accept = await client.request<any>("POST", `/api/member/requests/${id}`, { headers: bearer(max), body: { action: "accept" } });
    const beforeApproval = await staffOn(EARLY, THURSDAY);
    const pending = await client.request<any>("GET", "/api/requests", { jar: planner });
    const approve = await client.request<any>("POST", `/api/requests/${id}`, { jar: planner, csrf: true, body: { action: "approve" } });
    const afterApproval = await staffOn(EARLY, THURSDAY);
    const revert = await client.request<any>("POST", `/api/requests/${id}`, { jar: planner, csrf: true, body: { action: "revert" } });

    expect(setting.json).toEqual({ requiresApproval: true });
    expect(accept.json!.request.status).toBe("pending_approval");
    expect(beforeApproval).toEqual([ANNA]);
    expect(pending.json!.requests[0]).toMatchObject({ request_id: id, status: "pending_approval" });
    expect(approve.json!.request).toMatchObject({ status: "done", decided_by: "admin" });
    expect(afterApproval).toEqual([MAX]);
    expect(revert.json!.request.status).toBe("reverted");
    expect(await staffOn(EARLY, THURSDAY)).toEqual([ANNA]);
    expect(await staffOn(LATE, THURSDAY)).toEqual([MAX]);
  });

  it("keeps the setting for admins only", async () => {
    const planner = await client.loginAs("planner", "planner1234");
    const response = await client.request("POST", "/api/requests/settings", {
      jar: planner,
      csrf: true,
      body: { requiresApproval: true },
    });
    expect(response.status).toBe(403);
  });
});
