import { getAuthConfig } from "~/server/config/auth-config";

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

export function getClientIP(event: any): string {
  const socketIP = event.node?.req?.socket?.remoteAddress || "unknown";

  if (!getAuthConfig().trustProxyHeaders) {
    return socketIP;
  }

  const cfIP = getHeader(event, "cf-connecting-ip");
  if (cfIP) return cfIP;

  const xForwardedFor = getHeader(event, "x-forwarded-for");
  if (xForwardedFor) {
    const forwardedIp = xForwardedFor.split(",")[0]?.trim();
    if (forwardedIp) return forwardedIp;
  }

  const xRealIP = getHeader(event, "x-real-ip");
  if (xRealIP) return xRealIP;

  return socketIP;
}
