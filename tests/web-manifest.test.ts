import fs from "node:fs";
import { createApp, toWebHandler } from "h3";
import { describe, expect, it, vi } from "vitest";
import { appHead } from "~/config/nuxt/head";
import manifestRoute from "~/server/routes/manifest.json";

// public/manifest.json as it was shipped until the manifest came from the catalog.
const SHIPPED = `{
  "name": "Shiftplan",
  "short_name": "Shiftplan",
  "description": "Dienstplan im Browser planen, im Team per App ansehen.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#fafafa",
  "theme_color": "#fafafa",
  "icons": [
    {
      "src": "/favicon-16x16.png",
      "sizes": "16x16",
      "type": "image/png"
    },
    {
      "src": "/favicon-32x32.png",
      "sizes": "32x32",
      "type": "image/png"
    },
    {
      "src": "/apple-touch-icon.png",
      "sizes": "180x180",
      "type": "image/png"
    },
    {
      "src": "/android-chrome-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/android-chrome-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    }
  ]
}
`;

async function fetchManifest(headers: Record<string, string> = {}, method = "GET") {
  const app = createApp().use("/manifest.json", manifestRoute);
  return toWebHandler(app)(new Request("http://localhost/manifest.json", { headers, method }));
}

describe("web app manifest", () => {
  it("serves the former static file byte for byte in German", async () => {
    const response = await fetchManifest({ "accept-language": "de-DE,de;q=0.9" });

    expect(await response.text()).toBe(SHIPPED);
    expect(response.headers.get("content-type")).toBe("application/manifest+json; charset=utf-8");
    expect(response.headers.get("content-length")).toBe(String(Buffer.byteLength(SHIPPED)));
    expect(response.headers.get("cache-control")).toBe("private, max-age=3600");
    expect(response.headers.get("vary")).toBe("Accept-Language, Cookie");
  });

  it("answers HEAD like the static file did: GET headers, no body", async () => {
    const [get, head] = await Promise.all([fetchManifest(), fetchManifest({}, "HEAD")]);

    expect(head.status).toBe(200);
    expect(await head.text()).toBe("");
    expect(Object.fromEntries(head.headers)).toEqual(Object.fromEntries(get.headers));
  });

  it("refuses other methods", async () => {
    const response = await fetchManifest({}, "POST");

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET, HEAD");
    expect(await response.text()).toBe("");
  });

  it("falls back to German for other languages and without a header", async () => {
    expect(await (await fetchManifest({ "accept-language": "fr-FR" })).text()).toBe(SHIPPED);
    expect(await (await fetchManifest()).text()).toBe(SHIPPED);
  });

  it("takes its texts from the catalog", async () => {
    vi.resetModules();
    vi.doMock("~/i18n/server", () => ({ t: (locale: string, key: string) => `${locale}:${key}` }));
    const { default: route } = await import("~/server/routes/manifest.json");
    const app = createApp().use("/manifest.json", route);
    const manifest = await (await toWebHandler(app)(new Request("http://localhost/manifest.json"))).json();
    vi.doUnmock("~/i18n/server");

    expect([manifest.name, manifest.short_name, manifest.description]).toEqual([
      "de:app.manifest.name",
      "de:app.manifest.shortName",
      "de:app.manifest.description",
    ]);
  });

  it("stays at the path the page links and installed apps know", () => {
    expect(appHead?.link).toContainEqual({ rel: "manifest", href: "/manifest.json" });
    // A static file would win over the route and serve one language to everyone.
    expect(fs.existsSync("public/manifest.json")).toBe(false);
  });
});
