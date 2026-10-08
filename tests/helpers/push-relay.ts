import { expect } from "vitest";
import { client, currentWeek, openPushClient, relayFetch } from "./push-client";
import { sendNotification } from "./web-push-mock";

export const ALL = "token-all:APA91b";
export const MINE_MAX = "token-max:APA91b";
export const MINE_ANNA = "token-anna:APA91b";
export const MINE_OTHER = "token-other:APA91b";

export type RelayCall = { url: string; auth?: string; body: any };

/** Requests the relay received in the running test. */
export const calls: RelayCall[] = [];
/** One-off answers for the next relay requests; afterwards the relay accepts everything. */
export const relayResponses: Array<(call: RelayCall) => Response> = [];

export function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

/** Like openPushClient(), plus a working fake relay and a third staff member, Olaf. */
export async function openRelayClient() {
  sendNotification.mockReset();
  sendNotification.mockResolvedValue({ statusCode: 201 });
  calls.length = 0;
  relayResponses.length = 0;
  relayFetch.mockReset();
  relayFetch.mockImplementation(async (url: string, init: RequestInit) => {
    const headers = init.headers as Record<string, string>;
    const call = { url, auth: headers.authorization, body: JSON.parse(String(init.body)) };
    calls.push(call);
    const next = relayResponses.shift();
    if (next) return next(call);
    if (url.endsWith("/v1/instances")) return json(201, { instanceId: "inst_test", secret: "sk_test" });
    return json(200, { sent: call.body.tokens.length, failed: 0, invalidTokens: [] });
  });
  await openPushClient();
  client.mainDb.prepare("INSERT INTO staff (name, active, is_parttime) VALUES ('Olaf', 1, 0)").run();
}

export async function registerDevices() {
  for (const body of [
    { platform: "android", token: ALL },
    { platform: "ios", token: MINE_MAX, staffId: 2, scope: "mine" },
    { platform: "ios", token: MINE_ANNA, staffId: 1, scope: "mine" },
    { platform: "android", token: MINE_OTHER, staffId: 3, scope: "mine" },
  ]) {
    const response = await client.request("POST", "/api/push/devices", { body });
    expect(response.status).toBe(200);
  }
}

export async function changeShift(route: "assign" | "unassign", staffId: number) {
  const { year, week } = currentWeek();
  const planner = await client.loginAs("planner", "planner1234");
  await client.request("POST", `/api/shiftplan/${route}`, {
    jar: planner,
    csrf: true,
    body: { staff_id: staffId, shift_id: 1, year, week },
  });
}
