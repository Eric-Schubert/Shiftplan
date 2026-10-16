import type { H3Event } from "h3";
import { getAuthConfig } from "~/server/config/auth-config";
import { networkOf } from "~/server/lib/session/network";

export function getSessionToken(event: H3Event): string | undefined {
  const authHeader = getHeader(event, "authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  const cookieToken = getCookie(event, getAuthConfig().session.cookies.sessionName);
  if (cookieToken) {
    return cookieToken;
  }

  return undefined;
}

export function getCsrfTokenFromRequest(event: H3Event): string | undefined {
  return getHeader(event, "x-csrf-token") || undefined;
}

/** Planners use cookies in the browser and a Bearer token in the app. */
export function requestSource(event: H3Event): "web" | "app" {
  return getHeader(event, "authorization")?.startsWith("Bearer ") ? "app" : "web";
}

const warned = new Set<string>();

function warnOnce(key: string, message: string): void {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(`[auth] ${message}`);
}

export function getClientIP(event: H3Event): string {
  const socketIP = event.node?.req?.socket?.remoteAddress || "unknown";
  const trust = getAuthConfig().trustProxyHeaders;

  if (!trust) {
    // Behind a proxy every client then shares the proxy's address and its limits.
    if (socketIP !== "unknown" && getHeader(event, "x-forwarded-for")) {
      warnOnce(
        "untrusted",
        "Requests arrive through a proxy, but SHIFTPLAN_TRUST_PROXY_HEADERS is off: all clients share one sign-in limit."
      );
    }
    return socketIP;
  }

  // Only Cloudflare overwrites this header. Any other proxy passes on what the client sent.
  const cfIP = getHeader(event, "cf-connecting-ip")?.trim();
  if (trust === "cloudflare" && cfIP) return cfIP;
  if (cfIP) {
    // Behind Cloudflare the rightmost entry is the Cloudflare edge, shared by many visitors.
    warnOnce(
      "cloudflare",
      "CF-Connecting-IP arrived while SHIFTPLAN_TRUST_PROXY_HEADERS is true. Behind Cloudflare, set it to cloudflare, " +
        "or all visitors of one Cloudflare location share one sign-in limit."
    );
  }

  // The proxy in front appends the address it saw. Everything left of it came from the client.
  const forwarded = getHeader(event, "x-forwarded-for")
    ?.split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return forwarded?.at(-1) || socketIP;
}

/** Rate-limit key of the client: its address, or its /64 network for IPv6. */
export function getClientNetwork(event: H3Event): string {
  return networkOf(getClientIP(event));
}
