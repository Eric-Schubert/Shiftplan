import { describe, expect, it, vi } from "vitest";
import { ANNA, MAX, bearer, client, inviteAndRedeem, useMemberAccessClient } from "./helpers/member-access";
import { webPushMock } from "./helpers/web-push-mock";

vi.mock("web-push", () => webPushMock);
useMemberAccessClient();

describe("personal app access", () => {
  it("redeems a personal QR code once and identifies the staff member", async () => {
    const { code, path, token, staff } = await inviteAndRedeem(ANNA);

    const me = await client.request("GET", "/api/member/me", { headers: bearer(token) });
    const again = await client.request("POST", "/api/member/redeem", { body: { code } });
    const formatted = await client.request("POST", "/api/member/redeem", {
      body: { code: `${code.slice(0, 5).toLowerCase()}-${code.slice(5)}` },
    });

    expect(code).toMatch(/^[A-Z2-9]{10}$/);
    expect(path).toBe(`/?einladung=${code}`);
    expect(staff).toMatchObject({ id: ANNA, name: "Anna Weber" });
    expect(me.json).toMatchObject({ staff: { id: ANNA, name: "Anna Weber" } });
    expect(again.status).toBe(401);
    expect(formatted.status).toBe(401);
    expect(client.adminDb.prepare("SELECT token_hash FROM member_sessions").get()).not.toEqual({ token_hash: token });
  });

  it("accepts codes typed with spaces or dashes and rejects expired ones", async () => {
    const planner = await client.loginAs("planner", "planner1234");
    const create = async () =>
      (await client.request<{ code: string }>("POST", "/api/member-invites", { jar: planner, csrf: true, body: { staffId: MAX } }))
        .json!.code;

    const typed = await create();
    const ok = await client.request("POST", "/api/member/redeem", {
      body: { code: `${typed.slice(0, 5).toLowerCase()} ${typed.slice(5)}` },
    });
    const expired = await create();
    client.adminDb.prepare("UPDATE member_invites SET expires_at = 1 WHERE used_at IS NULL").run();
    const late = await client.request("POST", "/api/member/redeem", { body: { code: expired } });
    const inactive = await client.request("POST", "/api/member-invites", { jar: planner, csrf: true, body: { staffId: 3 } });

    expect(ok.status).toBe(200);
    expect(late.status).toBe(401);
    expect(inactive.status).toBe(404);
  });

  it("lets everyone use the demo code again and again, but only where it is configured", async () => {
    const redeem = (code: string) =>
      client.request<{ staff: { id: number; name: string } }>("POST", "/api/member/redeem", {
        body: { code, deviceName: "Review" },
      });

    const disabled = await redeem("DEMO");
    process.env.SHIFTPLAN_DEMO_MEMBER_CODE = "demo";
    process.env.SHIFTPLAN_DEMO_MEMBER_NAME = "Max Mustermann";
    try {
      const first = await redeem("DEMO");
      const second = await redeem(" de-mo ");
      const wrong = await redeem("DEMO2");

      expect(first.status).toBe(200);
      expect(first.json!.staff).toMatchObject({ id: MAX, name: "Max Mustermann" });
      expect(second.status).toBe(200);
      expect(wrong.status).toBe(401);
    } finally {
      delete process.env.SHIFTPLAN_DEMO_MEMBER_CODE;
      delete process.env.SHIFTPLAN_DEMO_MEMBER_NAME;
    }
    expect(disabled.status).toBe(401);
  });
});
