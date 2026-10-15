import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient, type ApiClient } from "./helpers/api-harness";

const GRAPH_ENV = {
  CONTACT_MAIL_PROVIDER: "graph",
  CONTACT_MAIL_TO: "ziel@example.com",
  CONTACT_MAIL_GRAPH_TENANT_ID: "tenant-id",
  CONTACT_MAIL_GRAPH_CLIENT_ID: "client-id",
  CONTACT_MAIL_GRAPH_CLIENT_SECRET: "client-secret",
  CONTACT_MAIL_GRAPH_FROM: "postfach@example.com",
};

let client: ApiClient;
const graphCalls: Array<{ url: string; init: RequestInit }> = [];

const send = (body: Record<string, string>) => client.request("POST", "/api/contact", { body });

async function storedMessages() {
  const admin = await client.loginAs("admin", "admin1234");
  const list = await client.request<{ messages: Array<Record<string, unknown>> }>("GET", "/api/contact/messages", { jar: admin });
  return list.json!.messages;
}

describe("contact form", () => {
  beforeEach(async () => {
    graphCalls.length = 0;
    for (const [key, value] of Object.entries(GRAPH_ENV)) vi.stubEnv(key, value);
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      graphCalls.push({ url: String(url), init });
      return String(url).includes("/oauth2/")
        ? new Response(JSON.stringify({ access_token: "token", expires_in: 3600 }), { status: 200 })
        : new Response(null, { status: 202 });
    });
    client = await createApiClient([
      ["post", "/api/auth/login", "server/api/auth/login.post"],
      ["post", "/api/contact", "server/api/contact.post"],
      ["get", "/api/contact/messages", "server/api/contact/messages.get"],
    ]);
  });

  afterEach(() => {
    client.close();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("stores and mails the text as typed", async () => {
    const response = await send({
      name: "R&D <Team>",
      replyTo: "Eva Muster <eva@example.com>",
      subject: "Früh <-> Spät",
      message: "  Kann ich Früh & Spät tauschen? <3  ",
    });
    const [stored] = await storedMessages();
    const mail = JSON.parse(String(graphCalls.find((call) => call.url.includes("/sendMail"))!.init.body));

    expect(response.status).toBe(200);
    expect(stored).toMatchObject({
      name: "R&D <Team>",
      reply_to: "Eva Muster <eva@example.com>",
      subject: "Früh <-> Spät",
      message: "Kann ich Früh & Spät tauschen? <3",
    });
    expect(mail.message.replyTo).toEqual([{ emailAddress: { address: "eva@example.com", name: "R&D <Team>" } }]);
    expect(mail.message.body.content).toContain("Kann ich Früh & Spät tauschen? <3");
  });

  it("checks lengths on the trimmed text and sets no reply-to for a phone number", async () => {
    const short = await send({ name: "Eva", replyTo: "0351 123456", message: "   zu kurz   " });
    const symbols = await send({ name: "Eva", replyTo: "0351 123456", message: "<<<<<<<<<<" });
    const mail = JSON.parse(String(graphCalls.find((call) => call.url.includes("/sendMail"))!.init.body));

    expect([short.status, symbols.status]).toEqual([400, 200]);
    expect((await storedMessages()).map((message) => message.message)).toEqual(["<<<<<<<<<<"]);
    expect(mail.message.replyTo).toBeUndefined();
  });

  it("gives every Microsoft Graph call a timeout", async () => {
    await send({ name: "Eva", replyTo: "eva@example.com", message: "Bitte um Rückruf." });

    expect(graphCalls).toHaveLength(2);
    expect(graphCalls.every((call) => call.init.signal instanceof AbortSignal)).toBe(true);
  });
});
