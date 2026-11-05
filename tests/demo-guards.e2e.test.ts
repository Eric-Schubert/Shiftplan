import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient, type ApiClient } from "./helpers/api-harness";
import { apiRoutes } from "./helpers/routes";
import { webPushMock } from "./helpers/web-push-mock";

vi.mock("web-push", () => webPushMock);

// A public demo shares one planner login and one member code among all visitors.
const DEMO_ENV = {
  NUXT_PUBLIC_DEMO_LOGIN_USERNAME: "planner",
  NUXT_PUBLIC_DEMO_LOGIN_PASSWORD: "planner1234",
  SHIFTPLAN_DEMO_MEMBER_CODE: "demo",
  SHIFTPLAN_DEMO_MEMBER_NAME: "Max Mustermann",
  SHIFTPLAN_PUSH_RELAY_URL: "off",
};
const SAME_ORIGIN = { origin: "http://localhost", host: "localhost" };

let client: ApiClient;

async function demoVisitor(deviceName: string): Promise<string> {
  const redeem = await client.request<{ token: string }>("POST", "/api/member/redeem", { body: { code: "DEMO", deviceName }, headers: SAME_ORIGIN });
  expect(redeem.status).toBe(200);
  return redeem.json!.token;
}

describe("public demo", () => {
  beforeEach(async () => {
    for (const [key, value] of Object.entries(DEMO_ENV)) vi.stubEnv(key, value);
    client = await createApiClient(
      apiRoutes("auth/login.post.ts", "push/notify.post.ts", "member/redeem.post.ts", "member/pin.put.ts", "member/me.get.ts"),
      (db) => db.prepare("INSERT INTO staff (name, short_code) VALUES ('Max Mustermann', 'MM')").run()
    );
  });

  afterEach(() => {
    client.close();
    vi.unstubAllEnvs();
  });

  it("sends no team push from the published demo login", async () => {
    const demo = await client.loginAs("planner", "planner1234");
    const admin = await client.loginAs("admin", "admin1234");

    const fromDemo = await client.request("POST", "/api/push/notify", { jar: demo, csrf: true, body: { message: "Hallo" } });
    const fromAdmin = await client.request("POST", "/api/push/notify", { jar: admin, csrf: true, body: { message: "Hallo" } });

    expect(fromDemo.status).toBe(403);
    expect(fromAdmin.status).toBe(200);
  });

  it("lets no demo visitor set a PIN and sign the others out", async () => {
    const reviewer = await demoVisitor("Reviewer");
    const visitor = await demoVisitor("Visitor");
    const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

    const setPin = await client.request("PUT", "/api/member/pin", { headers: bearer(visitor), body: { pin: "582039" } });
    const reviewerMe = await client.request("GET", "/api/member/me", { headers: bearer(reviewer) });

    expect(setPin.status).toBe(403);
    expect(reviewerMe.status).toBe(200);
  });
});
