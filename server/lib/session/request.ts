import { getAuthConfig } from "~/server/config/auth-config";
import { networkOf } from "~/server/lib/session/network";

export function getSessionToken(event: any): string | undefined {
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

export function getCsrfTokenFromRequest(event: any): string | undefined {
  return getHeader(event, "x-csrf-token") || undefined;
}

let warnedAboutUntrustedProxy = false;

/** Behind a proxy without trusted headers every client shares the proxy's address and its limits. */
function warnAboutUntrustedProxy(event: any, socketIP: string): void {
  if (warnedAboutUntrustedProxy || socketIP === "unknown" || !getHeader(event, "x-forwarded-for")) return;
  warnedAboutUntrustedProxy = true;
  console.warn(
    "[auth] Requests arrive through a proxy, but SHIFTPLAN_TRUST_PROXY_HEADERS is off: all clients share one sign-in limit."
  );
}

export function getClientIP(event: any): string {
  const socketIP = event.node?.req?.socket?.remoteAddress || "unknown";
  const trust = getAuthConfig().trustProxyHeaders;

  if (!trust) {
    warnAboutUntrustedProxy(event, socketIP);
    return socketIP;
  }

  // Only Cloudflare overwrites this header. Any other proxy passes on what the client sent.
  if (trust === "cloudflare") {
    const cfIP = getHeader(event, "cf-connecting-ip")?.trim();
    if (cfIP) return cfIP;
  }

  // The proxy in front appends the address it saw. Everything left of it came from the client.
  const forwarded = getHeader(event, "x-forwarded-for")
    ?.split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return forwarded?.at(-1) || socketIP;
}

/** Rate-limit key of the client: its address, or its /64 network for IPv6. */
export function getClientNetwork(event: any): string {
  return networkOf(getClientIP(event));
}
