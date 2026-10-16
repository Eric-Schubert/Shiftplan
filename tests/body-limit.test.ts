import { request as httpRequest, createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createApp, createError, defineEventHandler, getHeader, getMethod, getRequestURL, readBody, readRawBody, toNodeListener } from "h3";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

let server: Server;
let limits: { json: number; excel: number };

type Sent = { status: number; body: string };

/** Sends a body either chunked (no Content-Length) or with a declared length. */
function send(path: string, body: Buffer, mode: "chunked" | "length"): Promise<Sent> {
  const { port } = server.address() as AddressInfo;
  return new Promise((resolve, reject) => {
    const headers: Record<string, string | number> = { "content-type": "application/json" };
    if (mode === "length") headers["content-length"] = body.length;
    const request = httpRequest({ port, path, method: "POST", headers }, (response) => {
      const chunks: Buffer[] = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolve({ status: response.statusCode!, body: Buffer.concat(chunks).toString() }));
    });
    request.on("error", reject);
    for (let offset = 0; offset < body.length; offset += 16 * 1024) request.write(body.subarray(offset, offset + 16 * 1024));
    request.end();
  });
}

// `{"text":""}` takes 11 bytes, so the body is exactly `size` bytes long.
const json = (size: number) => Buffer.from(JSON.stringify({ text: "x".repeat(size - 11) }));

beforeAll(async () => {
  Object.assign(globalThis, { createError, defineEventHandler, getHeader, getMethod, getRequestURL });
  const middleware = await import("../server/middleware/body-limit");
  limits = { json: middleware.getBodyLimit("/api/contact"), excel: middleware.getBodyLimit("/api/rotation/excel-import") };

  const app = createApp();
  app.use(middleware.default);
  app.use(
    "/api/rotation/excel-import",
    defineEventHandler(async (event) => ({ bytes: (await readRawBody(event, false))?.length ?? 0 }))
  );
  app.use(defineEventHandler(async (event) => ({ length: ((await readBody(event)) as { text: string }).text.length })));
  server = createServer(toNodeListener(app));
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
});

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

describe("request body limit", () => {
  it("passes normal bodies through, chunked or not", async () => {
    const chunked = await send("/api/contact", json(40_000), "chunked");
    const declared = await send("/api/contact", json(40_000), "length");

    expect([chunked.status, declared.status]).toEqual([200, 200]);
    expect(JSON.parse(chunked.body)).toEqual({ length: 40_000 - 11 });
  });

  it("rejects bodies above the limit before a handler buffers them", async () => {
    const atLimit = await send("/api/contact", json(limits.json), "chunked");
    const chunked = await send("/api/contact", json(limits.json + 1), "chunked");
    const declared = await send("/api/push/unsubscribe", json(limits.json + 1), "length");

    expect([atLimit.status, chunked.status, declared.status]).toEqual([200, 413, 413]);
  });

  it("allows the Excel import its own, larger limit", async () => {
    const fits = await send("/api/rotation/excel-import", Buffer.alloc(limits.excel), "chunked");
    const tooBig = await send("/api/rotation/excel-import", Buffer.alloc(limits.excel + 1), "chunked");
    const elsewhere = await send("/api/contact", Buffer.alloc(limits.json + 1), "length");

    expect(limits.excel).toBeGreaterThan(2 * 1024 * 1024);
    expect(JSON.parse(fits.body)).toEqual({ bytes: limits.excel });
    expect([tooBig.status, elsewhere.status]).toEqual([413, 413]);
    expect(JSON.parse(tooBig.body).statusMessage).toBe("Die Excel-Datei darf maximal 2 MB groß sein");
    expect(JSON.parse(elsewhere.body).statusMessage).toBe("Die Anfrage ist zu groß");
  });
});
