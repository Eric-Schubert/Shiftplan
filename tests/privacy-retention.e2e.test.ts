import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient, type ApiClient } from "./helpers/api-harness";

const MAIL_ENV = [
  "CONTACT_MAIL_PROVIDER",
  "CONTACT_MAIL_TO",
  "CONTACT_MAIL_GRAPH_TENANT_ID",
  "CONTACT_MAIL_GRAPH_CLIENT_ID",
  "CONTACT_MAIL_GRAPH_CLIENT_SECRET",
  "CONTACT_MAIL_GRAPH_FROM",
];

let client: ApiClient;

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-05T08:00:00Z") });
  for (const name of MAIL_ENV) vi.stubEnv(name, "");
  client = await createApiClient(
    [
      ["post", "/api/auth/login", "server/api/auth/login.post"],
      ["get", "/api/audit", "server/api/audit/index.get"],
      ["get", "/api/requests", "server/api/requests/index.get"],
      ["get", "/api/legal/privacy", "server/api/legal/privacy.get"],
    ],
    (db) => {
      db.prepare("INSERT INTO staff (name, active, is_parttime) VALUES ('Anna Weber', 1, 0)").run();
    }
  );
});

afterEach(() => {
  client.close();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("retention", () => {
  it("deletes change log entries after two years", async () => {
    const insert = client.mainDb.prepare(
      "INSERT INTO audit_log (user_id, username, action, year, week_number, staff_name, created_at) VALUES (1, 'planner', 'assign', 2024, 1, 'Anna Weber', ?)"
    );
    insert.run("2024-10-04 08:00:00");
    insert.run("2024-10-06 08:00:00");
    const admin = await client.loginAs("admin", "admin1234");

    const audit = await client.request<{ entries: { created_at: string }[] }>("GET", "/api/audit", { jar: admin });

    expect(audit.json!.entries.map((entry) => entry.created_at)).toEqual(["2024-10-06 08:00:00"]);
  });

  it("forgets request messages 90 days after the request but keeps the request", async () => {
    const insert = client.mainDb.prepare(
      "INSERT INTO shift_requests (kind, status, requester_staff_id, date_from, date_to, message, created_by) VALUES ('takeover', 'open', 1, ?, ?, ?, 'Anna Weber')"
    );
    insert.run("2026-07-06", "2026-07-06", "bin krank");
    insert.run("2026-07-07", "2026-07-07", "Arzttermin");
    const planner = await client.loginAs("planner", "planner1234");

    const list = await client.request<{ requests: { date_to: string; message: string | null }[] }>(
      "GET",
      "/api/requests",
      { jar: planner }
    );

    expect(list.json!.requests.map(({ date_to, message }) => ({ date_to, message }))).toEqual([
      { date_to: "2026-07-07", message: "Arzttermin" },
      { date_to: "2026-07-06", message: null },
    ]);
  });
});

describe("privacy facts", () => {
  it("names Microsoft only with a complete contact mail setup", async () => {
    const without = await client.request<{ microsoft: boolean }>("GET", "/api/legal/privacy");
    vi.stubEnv("CONTACT_MAIL_PROVIDER", "graph");
    const incomplete = await client.request<{ microsoft: boolean }>("GET", "/api/legal/privacy");
    vi.stubEnv("CONTACT_MAIL_TO", "team@example.com");
    vi.stubEnv("CONTACT_MAIL_GRAPH_TENANT_ID", "tenant");
    vi.stubEnv("CONTACT_MAIL_GRAPH_CLIENT_ID", "client");
    vi.stubEnv("CONTACT_MAIL_GRAPH_CLIENT_SECRET", "secret");
    vi.stubEnv("CONTACT_MAIL_GRAPH_FROM", "postfach@example.com");
    const complete = await client.request<{ microsoft: boolean }>("GET", "/api/legal/privacy");

    expect([without.status, without.json, incomplete.json, complete.json]).toEqual([
      200,
      { microsoft: false },
      { microsoft: false },
      { microsoft: true },
    ]);
  });
});
