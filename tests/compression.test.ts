import { brotliDecompressSync, gunzipSync } from "node:zlib";
import { createApp, createRouter, defineEventHandler, setResponseHeader, toPlainHandler } from "h3";
import { beforeAll, describe, expect, it, vi } from "vitest";

type Hook = (event: unknown, response: { body?: unknown }) => void;
let hook: Hook;
let preferredEncoding: (header: string) => string | null;

beforeAll(async () => {
  vi.stubGlobal("defineNitroPlugin", (plugin: unknown) => plugin);
  const module = await import("~/server/plugins/compression");
  preferredEncoding = module.preferredEncoding;
  (module.default as unknown as (app: unknown) => void)({ hooks: { hook: (_name: string, fn: Hook) => (hook = fn) } });
});

const rows = Array.from({ length: 200 }, (_, index) => ({ staff_id: index, name: `Person ${index}` }));

async function get(path: string, acceptEncoding: string) {
  const router = createRouter()
    .get(
      "/api/staff",
      defineEventHandler(() => rows)
    )
    .get(
      "/api/small",
      defineEventHandler(() => ({ ok: true }))
    )
    .get(
      "/api/csv",
      defineEventHandler((event) => {
        setResponseHeader(event, "content-type", "text/csv");
        return "a;b\n".repeat(500);
      })
    );
  const app = createApp({ onBeforeResponse: (event, response) => hook(event, response) });
  app.use(router);
  const response = await toPlainHandler(app)({ method: "GET", path, headers: { "accept-encoding": acceptEncoding } });
  const headers = Object.fromEntries(response.headers);
  return { headers, body: response.body as Buffer };
}

describe("compression plugin", () => {
  it("compresses JSON answers of API handlers and keeps the JSON content type", async () => {
    const response = await get("/api/staff", "gzip, deflate, br");

    expect(response.headers["content-encoding"]).toBe("br");
    expect(response.headers["content-type"]).toBe("application/json");
    expect(JSON.parse(brotliDecompressSync(response.body).toString())).toEqual(rows);
  });

  it("honours q=0 and falls back to gzip", async () => {
    const response = await get("/api/staff", "br;q=0, gzip");

    expect(response.headers["content-encoding"]).toBe("gzip");
    expect(JSON.parse(gunzipSync(response.body).toString())).toEqual(rows);
  });

  it("leaves small answers, unknown encodings and other text types alone", async () => {
    expect((await get("/api/small", "br")).headers["content-encoding"]).toBeUndefined();
    expect((await get("/api/staff", "identity")).headers["content-encoding"]).toBeUndefined();
    expect((await get("/api/csv", "gzip")).headers["content-encoding"]).toBe("gzip");
  });

  it.each([
    ["gzip, deflate, br", "br"],
    ["br;q=0", null],
    ["gzip;q=1, br;q=0.5", "gzip"],
    ["BR; q=0.8, gzip;q=0.8", "br"],
    ["*", null],
    ["", null],
  ])("picks %j as %j", (header, expected) => {
    expect(preferredEncoding(header)).toBe(expected);
  });
});
