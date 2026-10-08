import { vi } from "vitest";

/** Requests the fake relay received; clear it per test. */
export const relayCalls: Array<{ url: string; body: any }> = [];

/** A push relay that accepts every request. */
export function stubRelay() {
  process.env.SHIFTPLAN_PUSH_RELAY_URL = "https://relay.test";
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body));
    relayCalls.push({ url, body });
    const payload = url.endsWith("/v1/instances")
      ? { instanceId: "inst_test", secret: "sk_test" }
      : { sent: body.tokens.length, failed: 0, invalidTokens: [] };
    return new Response(JSON.stringify(payload), { status: 200, headers: { "content-type": "application/json" } });
  });
}
