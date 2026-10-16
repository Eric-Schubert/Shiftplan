import { getAuthConfig } from "~/server/config/auth-config";

// The visit endpoint is public and writes a row per call. A browser posts once per page view, so a few
// hundred an hour per network leaves room for a whole office behind one address but not for a script.
const WINDOW_MS = 60 * 60 * 1000;
const MAX_VISITS_PER_WINDOW = 300;
const windows = new Map<string, { start: number; count: number }>();

/** Whether one more visit from this network may be recorded in the current hour. */
export function allowVisit(network: string, now = Date.now()): boolean {
  for (const [key, entry] of windows) {
    if (now - entry.start >= WINDOW_MS) windows.delete(key);
  }

  const entry = windows.get(network);
  if (!entry) {
    windows.set(network, { start: now, count: 1 });
    return true;
  }
  entry.count++;
  return entry.count <= MAX_VISITS_PER_WINDOW;
}

const CLOUDFLARE_HEADERS = { country: ["cf-ipcountry"], region: [], city: [] };
const PROXY_HEADERS = {
  country: ["cf-ipcountry", "x-vercel-ip-country", "cloudfront-viewer-country", "x-appengine-country", "x-country-code"],
  region: ["x-vercel-ip-country-region", "x-appengine-region", "x-region"],
  city: ["x-vercel-ip-city", "x-appengine-city", "x-city"],
};
const NO_HEADERS = { country: [], region: [], city: [] };

/**
 * The location headers to read. Any client can send them, so they count only behind a proxy the
 * instance trusts (SHIFTPLAN_TRUST_PROXY_HEADERS), and behind Cloudflare only the one it sets itself.
 */
export function trustedGeoHeaders(): { country: string[]; region: string[]; city: string[] } {
  const trust = getAuthConfig().trustProxyHeaders;
  if (trust === "cloudflare") return CLOUDFLARE_HEADERS;
  return trust ? PROXY_HEADERS : NO_HEADERS;
}
