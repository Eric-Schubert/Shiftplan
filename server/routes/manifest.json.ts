import { Buffer } from "node:buffer";
import { defineEventHandler, setResponseHeader, setResponseHeaders, setResponseStatus } from "h3";
import { t } from "~/i18n/server";
import { resolveLocale } from "~/server/utils/locale";

// The web app manifest in the visitor's language. Same path as the static file it replaces,
// so installed apps keep finding it. Only the texts depend on the language.
const ICONS = [
  { src: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
  { src: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
  { src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
  { src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
  { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
];

function webManifest(locale: string): string {
  const manifest = {
    name: t(locale, "app.manifest.name"),
    short_name: t(locale, "app.manifest.shortName"),
    description: t(locale, "app.manifest.description"),
    start_url: "/",
    display: "standalone",
    background_color: "#fafafa",
    theme_color: "#fafafa",
    icons: ICONS,
  };
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

// GET and HEAD like the static file; a HEAD (uptime monitors, link checkers) gets the headers without the body.
export default defineEventHandler((event) => {
  if (event.method !== "GET" && event.method !== "HEAD") {
    setResponseHeader(event, "allow", "GET, HEAD");
    setResponseStatus(event, 405);
    return "";
  }

  const body = webManifest(resolveLocale(event));
  setResponseHeaders(event, {
    "content-type": "application/manifest+json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    // The language comes from the cookie or Accept-Language, so shared caches must not hand it on.
    "cache-control": "private, max-age=3600",
    vary: "Accept-Language, Cookie",
  });
  return event.method === "HEAD" ? "" : body;
});
