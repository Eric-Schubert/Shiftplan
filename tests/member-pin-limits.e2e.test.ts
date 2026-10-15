import bcrypt from "bcryptjs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ANNA, SAME_ORIGIN, browserWithInvite, client, useMemberPinClient } from "./helpers/member-pin";
import { webPushMock } from "./helpers/web-push-mock";

vi.mock("web-push", () => webPushMock);
// Behind a proxy, so every request can come from its own address.
vi.stubEnv("SHIFTPLAN_TRUST_PROXY_HEADERS", "true");
useMemberPinClient();

function pinLogin(shortCode: string, pin: string, ip: string) {
  return client.request<any>("POST", "/api/member/login", {
    headers: { ...SAME_ORIGIN, "x-forwarded-for": ip },
    body: { shortCode, pin },
  });
}

async function annaWithPin() {
  const browser = await browserWithInvite(ANNA);
  await client.request("PUT", "/api/member/pin", { jar: browser, headers: SAME_ORIGIN, body: { pin: "482913" } });
}

async function invite(staffId: number): Promise<string> {
  const planner = await client.loginAs("planner", "planner1234");
  const response = await client.request<{ code: string }>("POST", "/api/member-invites", {
    jar: planner,
    csrf: true,
    body: { staffId },
  });
  return response.json!.code;
}

describe("PIN sign-in limits", () => {
  afterEach(() => vi.restoreAllMocks());

  it("does not let one network lock a colleague out", async () => {
    await annaWithPin();
    for (let attempt = 0; attempt < 6; attempt += 1) await pinLogin("AW", "111111", "198.51.100.66");

    expect((await pinLogin("AW", "482913", "198.51.100.66")).status).toBe(429);
    expect((await pinLogin("AW", "482913", "198.51.100.7")).status).toBe(200);
  });

  it("still caps guessing one Kürzel from many networks", async () => {
    await annaWithPin();
    for (const ip of ["198.51.100.1", "198.51.100.2", "198.51.100.3"]) {
      for (let attempt = 0; attempt < 5; attempt += 1) await pinLogin("AW", "111111", ip);
    }

    expect((await pinLogin("AW", "482913", "198.51.100.9")).status).toBe(429);
    expect((await pinLogin("MM", "482913", "198.51.100.9")).status).toBe(401);
  });

  it("runs one bcrypt check for unknown Kürzel, missing and malformed PINs alike", async () => {
    await annaWithPin();
    const compare = vi.spyOn(bcrypt, "compare");
    const compareSync = vi.spyOn(bcrypt, "compareSync");

    const answers = await Promise.all([
      pinLogin("ZZ", "482913", "198.51.100.1"),
      pinLogin("MM", "482913", "198.51.100.2"),
      pinLogin("AW", "x", "198.51.100.3"),
    ]);

    expect(answers.map((answer) => answer.status)).toEqual([401, 401, 401]);
    expect(compare).toHaveBeenCalledTimes(3);
    expect(compareSync).not.toHaveBeenCalled();
  });
});

describe("personal QR codes", () => {
  it("makes a person's earlier open codes invalid when a new one is issued", async () => {
    const first = await invite(ANNA);
    const second = await invite(ANNA);
    const redeem = (code: string) => client.request("POST", "/api/member/redeem", { body: { code } });

    expect((await redeem(first)).status).toBe(401);
    expect((await redeem(second)).status).toBe(200);
  });
});
