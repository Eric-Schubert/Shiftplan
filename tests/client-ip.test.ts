import { afterEach, describe, expect, it, vi } from "vitest";
import { networkOf } from "~/server/lib/session/network";

async function clientIP(trust: string, headers: Record<string, string>) {
  vi.stubEnv("SHIFTPLAN_TRUST_PROXY_HEADERS", trust);
  vi.stubGlobal("getHeader", (event: any, name: string) => event.headers?.[name.toLowerCase()]);
  vi.resetModules();
  const { getClientIP } = await import("~/server/lib/session/request");
  return getClientIP({ headers, node: { req: { socket: { remoteAddress: "203.0.113.5" } } } });
}

const SPOOFED = {
  "cf-connecting-ip": "198.51.100.10",
  "x-forwarded-for": "198.51.100.20, 198.51.100.21",
  "x-real-ip": "198.51.100.30",
};

describe("client address", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("ignores spoofable proxy headers by default", async () => {
    expect(await clientIP("false", SPOOFED)).toBe("203.0.113.5");
  });

  it("takes the entry the proxy appended, not the ones the client sent", async () => {
    expect(await clientIP("true", SPOOFED)).toBe("198.51.100.21");
    expect(await clientIP("true", { "x-forwarded-for": "198.51.100.20" })).toBe("198.51.100.20");
    expect(await clientIP("true", {})).toBe("203.0.113.5");
  });

  it("trusts CF-Connecting-IP only in Cloudflare mode", async () => {
    expect(await clientIP("cloudflare", SPOOFED)).toBe("198.51.100.10");
    expect(await clientIP("cloudflare", { "x-forwarded-for": "198.51.100.20, 162.158.1.1" })).toBe("162.158.1.1");
  });

  it("warns once when Cloudflare sends its header but only true is set", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv("SHIFTPLAN_TRUST_PROXY_HEADERS", "true");
    vi.stubGlobal("getHeader", (event: any, name: string) => event.headers?.[name.toLowerCase()]);
    vi.resetModules();
    const { getClientIP } = await import("~/server/lib/session/request");
    const event = { headers: SPOOFED, node: { req: { socket: { remoteAddress: "203.0.113.5" } } } };

    getClientIP(event);
    getClientIP(event);

    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0]![0]).toMatch(/set it to cloudflare/);
    warn.mockRestore();
  });

  it("groups IPv6 clients by their /64 network", () => {
    expect(networkOf("2001:db8:1:2:aaaa::1")).toBe("2001:db8:1:2::/64");
    expect(networkOf("2001:DB8:1:2:ffff:1:2:3")).toBe("2001:db8:1:2::/64");
    expect(networkOf("2001:db8::7")).toBe("2001:db8:0:0::/64");
    expect(networkOf("fe80::1%eth0")).toBe("fe80:0:0:0::/64");
    expect(networkOf("::ffff:192.0.2.7")).toBe("192.0.2.7");
    expect(networkOf("192.0.2.7")).toBe("192.0.2.7");
  });
});
