import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ADMIN_MIGRATIONS } from "~/server/lib/migrations/admin/index.js";
import { runMigrations } from "~/server/lib/migrations/runner.js";
import { groupByLocale } from "~/server/services/push/locales";
import { APPLE_ENDPOINT, FCM_ENDPOINT, client, closePushClient, currentWeek, stubPushRelay } from "./helpers/push-client";
import { calls, changeShift, openRelayClient } from "./helpers/push-relay";
import { KEYS, sendNotification, webPushMock } from "./helpers/web-push-mock";

vi.mock("web-push", () => webPushMock);
stubPushRelay();

describe("push locale migration", () => {
  it("gives existing subscriptions and devices German", () => {
    const db = new Database(":memory:");
    const pushLocale = ADMIN_MIGRATIONS.find((migration) => migration.id === "013_admin_push_locale")!;
    runMigrations(db, "admin", ADMIN_MIGRATIONS.filter((migration) => migration !== pushLocale), {
      bootstrapAdminPassword: "BootstrapPass1",
    });
    db.prepare("INSERT INTO push_subscriptions (endpoint, p256dh, auth) VALUES (?, ?, ?)").run(FCM_ENDPOINT, KEYS.p256dh, KEYS.auth);
    db.prepare("INSERT INTO push_devices (platform, token, scope) VALUES ('ios', 'token-old:1', 'all')").run();

    const { applied } = runMigrations(db, "admin", [pushLocale]);

    expect(applied.map((migration) => migration.id)).toEqual(["013_admin_push_locale"]);
    expect(pushLocale.shouldRun(db)).toBe(false);
    for (const table of ["push_subscriptions", "push_devices"]) {
      const column = db.prepare(`PRAGMA table_info(${table})`).all().find((entry: any) => entry.name === "locale");
      expect(column).toMatchObject({ type: "TEXT", notnull: 1, dflt_value: "'de'" });
      expect(db.prepare(`SELECT locale FROM ${table}`).all()).toEqual([{ locale: "de" }]);
    }
    db.close();
  });
});

describe("push locale per recipient", () => {
  beforeEach(openRelayClient);
  afterEach(closePushClient);

  const storedLocale = (table: string, column: string, value: string) =>
    (client.adminDb.prepare(`SELECT locale FROM ${table} WHERE ${column} = ?`).get(value) as { locale: string }).locale;

  it("stores the request's language with a subscription and renews it", async () => {
    const subscribe = () =>
      client.request("POST", "/api/push/subscribe", {
        body: { endpoint: FCM_ENDPOINT, keys: KEYS },
        headers: { "accept-language": "de-AT,en;q=0.5" },
      });

    expect((await subscribe()).status).toBe(200);
    expect(storedLocale("push_subscriptions", "endpoint", FCM_ENDPOINT)).toBe("de");

    client.adminDb.prepare("UPDATE push_subscriptions SET locale = 'xx'").run();
    await subscribe();
    expect(storedLocale("push_subscriptions", "endpoint", FCM_ENDPOINT)).toBe("de");
  });

  it("takes a supported language from the app and ignores anything else", async () => {
    for (const locale of ["de", "fr", "de-DE", "de_DE", 42, null, undefined]) {
      client.adminDb.prepare("UPDATE push_devices SET locale = 'xx'").run();
      const response = await client.request("POST", "/api/push/devices", {
        body: { platform: "ios", token: "token-app:1", locale },
        headers: { "accept-language": "de" },
      });

      expect(response.status).toBe(200);
      expect(storedLocale("push_devices", "token", "token-app:1")).toBe("de");
    }
  });

  it("prefers the app's language, also as de-DE or de_DE, over the request's", () => {
    const register = (locale: unknown) => {
      // "xx" stands in for a second request language, so the stored value shows which one won.
      client.push.PushService.registerDevice({ platform: "ios", token: "token-tag:1", locale }, undefined, "xx" as "de");
      return storedLocale("push_devices", "token", "token-tag:1");
    };

    expect(["de", "de-DE", "de_DE", " DE_at "].map(register)).toEqual(["de", "de", "de", "de"]);
    expect(["fr", "fr_FR", "", 42].map(register)).toEqual(["xx", "xx", "xx", "xx"]);
  });

  it("groups recipients by stored language; unknown values read German", () => {
    const groups = groupByLocale([{ id: 1, locale: "de" }, { id: 2, locale: "xx" }, { id: 3 }, { id: 4, locale: null }]);

    expect([...groups.keys()]).toEqual(["de"]);
    expect(groups.get("de")!.map((recipient) => recipient.id)).toEqual([1, 2, 3, 4]);
  });

  it("sends one text per language, so a German team still gets one relay call", async () => {
    for (const token of ["token-de:1", "token-xx:1"]) {
      await client.request("POST", "/api/push/devices", { body: { platform: "android", token } });
    }
    for (const endpoint of [FCM_ENDPOINT, APPLE_ENDPOINT]) {
      await client.request("POST", "/api/push/subscribe", { body: { endpoint, keys: KEYS } });
    }
    client.adminDb.prepare("UPDATE push_devices SET locale = 'xx' WHERE token = 'token-xx:1'").run();
    client.adminDb.prepare("UPDATE push_subscriptions SET locale = 'xx' WHERE endpoint = ?").run(APPLE_ENDPOINT);
    const { week } = currentWeek();

    await changeShift("assign", 1);
    await client.push.PushService.flushPendingChanges();
    const sends = calls.filter((call) => call.url.endsWith("/v1/send"));
    const bodies = sendNotification.mock.calls.map((call) => JSON.parse(String(call[1])));

    expect(sends.map((call) => [call.body.tokens, call.body.notification])).toEqual([
      [["token-de:1", "token-xx:1"], { title: "Schichtplan geändert", body: `KW ${week}: Frühschicht` }],
    ]);
    expect(bodies).toHaveLength(2);
    expect(bodies[0]).toEqual(bodies[1]);
    expect(bodies[0]).toMatchObject({ title: "Schichtplan geändert", body: `KW ${week} · Frühschicht: neu: Anna` });
  });
});
