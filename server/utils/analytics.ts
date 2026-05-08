const BOT_USER_AGENT_PATTERN =
  /(bot|crawler|spider|crawling|headless|preview|facebookexternalhit|slurp|bingpreview|duckduckbot|baiduspider|yandex|semrush|ahrefs|mj12bot|dotbot|petalbot|bytespider|uptime|monitor|lighthouse|pagespeed|curl|wget|python-requests|httpclient|libwww|node-fetch|go-http-client|java\/)/i;

const STATIC_ASSET_PATTERN =
  /\.(?:avif|css|gif|ico|jpg|jpeg|js|json|map|png|svg|txt|webmanifest|woff2?)$/i;

export function isLikelyBot(userAgent: string): boolean {
  return !userAgent || BOT_USER_AGENT_PATTERN.test(userAgent);
}

export function isTrackablePath(path: string): boolean {
  if (!path || path.startsWith("/api/")) return false;
  if (path.startsWith("/_nuxt/") || path.startsWith("/fonts/")) return false;
  if (path === "/settings" || path.startsWith("/settings/")) return false;
  if (STATIC_ASSET_PATTERN.test(path)) return false;
  return true;
}

export function normalizeAnalyticsPath(path: string | null | undefined): string | null {
  if (!path || typeof path !== "string") return null;

  const trimmed = path.trim();
  if (!trimmed.startsWith("/")) return null;

  const cleanPath = trimmed.split("#")[0]?.split("?")[0] || "/";
  return isTrackablePath(cleanPath) ? cleanPath : null;
}

export function readDecodedHeader(event: any, names: string[]): string | null {
  for (const name of names) {
    const value = getHeader(event, name);
    if (!value) continue;

    try {
      return decodeURIComponent(value.replace(/\+/g, " ")).trim();
    } catch {
      return value.trim();
    }
  }
  return null;
}
