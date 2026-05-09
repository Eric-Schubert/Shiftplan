import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ContactMailService,
  resetContactMailTokenCacheForTests,
} from "~/server/services/contact-mail.service";
import type { ContactMessage } from "~/types/contact";

const MAIL_ENV_KEYS = [
  "CONTACT_MAIL_PROVIDER",
  "CONTACT_MAIL_TO",
  "CONTACT_MAIL_GRAPH_TENANT_ID",
  "CONTACT_MAIL_GRAPH_CLIENT_ID",
  "CONTACT_MAIL_GRAPH_CLIENT_SECRET",
  "CONTACT_MAIL_GRAPH_FROM",
  "CONTACT_MAIL_SUBJECT_PREFIX",
  "CONTACT_MAIL_SAVE_TO_SENT_ITEMS",
];

const originalEnv = new Map<string, string | undefined>();

const contactMessage: ContactMessage = {
  contact_id: 42,
  name: "Eric Schuber",
  reply_to: "antwort@example.com",
  subject: "Dienstplan",
  message: "Hallo, ich habe eine Frage zum Dienstplan.",
  created_at: "2026-05-09 12:00:00",
  read_at: null,
};

beforeEach(() => {
  resetContactMailTokenCacheForTests();
  for (const key of MAIL_ENV_KEYS) {
    originalEnv.set(key, process.env[key]);
    delete process.env[key];
  }
});

afterEach(() => {
  resetContactMailTokenCacheForTests();
  vi.unstubAllGlobals();
  for (const key of MAIL_ENV_KEYS) {
    const value = originalEnv.get(key);
    if (typeof value === "undefined") {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  originalEnv.clear();
});

describe("ContactMailService", () => {
  it("sends no external request when mail delivery is not configured", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await ContactMailService.sendMessageNotification(contactMessage);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends contact notifications through Microsoft Graph", async () => {
    process.env.CONTACT_MAIL_PROVIDER = "graph";
    process.env.CONTACT_MAIL_TO = "ziel@example.com";
    process.env.CONTACT_MAIL_GRAPH_TENANT_ID = "tenant-id";
    process.env.CONTACT_MAIL_GRAPH_CLIENT_ID = "client-id";
    process.env.CONTACT_MAIL_GRAPH_CLIENT_SECRET = "client-secret";
    process.env.CONTACT_MAIL_GRAPH_FROM = "postfach@example.com";

    let sendMailPayload: Record<string, any> | undefined;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/oauth2/v2.0/token")) {
        return new Response(JSON.stringify({ access_token: "token", expires_in: 3600 }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      if (url.includes("/sendMail")) {
        sendMailPayload = JSON.parse(String(init?.body));
        return new Response(null, { status: 202 });
      }

      return new Response("Not found", { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    await ContactMailService.sendMessageNotification(contactMessage);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1][0])).toContain(
      "https://graph.microsoft.com/v1.0/users/postfach%40example.com/sendMail"
    );
    expect(sendMailPayload?.message.subject).toBe("[Schichtplaner] Dienstplan");
    expect(sendMailPayload?.message.toRecipients).toEqual([
      { emailAddress: { address: "ziel@example.com" } },
    ]);
    expect(sendMailPayload?.message.replyTo).toEqual([
      { emailAddress: { address: "antwort@example.com", name: "Eric Schuber" } },
    ]);
    expect(sendMailPayload?.message.body.content).toContain(
      "Hallo, ich habe eine Frage zum Dienstplan."
    );
  });
});
