import { afterEach, describe, expect, it } from "vitest";
import { createApiClient, type ApiClient } from "./helpers/api-harness";

const BROWSER = { "user-agent": "Mozilla/5.0 Safari/537.36" };
const originalTrust = process.env.SHIFTPLAN_TRUST_PROXY_HEADERS;
let client: ApiClient;

async function start(trust?: string) {
  if (trust === undefined) delete process.env.SHIFTPLAN_TRUST_PROXY_HEADERS;
  else process.env.SHIFTPLAN_TRUST_PROXY_HEADERS = trust;
  client = await createApiClient([["post", "/api/analytics/visit", "server/api/analytics/visit.post"]], undefined, BROWSER);
}

const visit = (headers: Record<string, string> = {}) => client.request("POST", "/api/analytics/visit?path=%2F", { headers });
const countries = () => client.mainDb.prepare("SELECT country_code FROM page_visits").all();

afterEach(() => {
  client.close();
  if (originalTrust === undefined) delete process.env.SHIFTPLAN_TRUST_PROXY_HEADERS;
  else process.env.SHIFTPLAN_TRUST_PROXY_HEADERS = originalTrust;
});

describe("POST /api/analytics/visit", () => {
  it("ignores location headers a client sends without a trusted proxy", async () => {
    await start();
    await visit({ "x-country-code": "XX", "cf-ipcountry": "XX" });
    expect(countries()).toEqual([{ country_code: null }]);
  });

  it("reads only Cloudflare's own header behind Cloudflare", async () => {
    await start("cloudflare");
    await visit({ "x-country-code": "XX" });
    await visit({ "cf-ipcountry": "DE" });
    expect(countries()).toEqual([{ country_code: null }, { country_code: "DE" }]);
  });

  it("records at most 300 visits per network and hour", async () => {
    await start();
    const results = [];
    for (let index = 0; index < 305; index++) results.push((await visit()).json.tracked);

    expect(results.filter(Boolean)).toHaveLength(300);
    expect(results.at(-1)).toBe(false);
    expect(client.mainDb.prepare("SELECT COUNT(*) AS count FROM page_visits").get()).toEqual({ count: 300 });
  });

  it("answers a request without path or body with tracked: false instead of a 500", async () => {
    await start();
    const response = await client.request("POST", "/api/analytics/visit");
    expect(response.status).toBe(200);
    expect(response.json).toEqual({ success: true, tracked: false });
  });
});
