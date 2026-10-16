import { Buffer } from "node:buffer";
import { brotliCompressSync, constants, gzipSync } from "node:zlib";
import { appendResponseHeader, getRequestHeader, getResponseHeader, removeResponseHeader, setResponseHeader, type H3Event } from "h3";

const MIN_COMPRESS_BYTES = 1024;
const TEXT_TYPES = ["text/", "application/javascript", "application/json", "application/manifest+json", "application/xml", "image/svg+xml"];

type Encoding = "br" | "gzip";

function isCompressible(eventPath: string, contentType: string, body: string | Buffer): boolean {
  if (contentType && TEXT_TYPES.some((type) => contentType.includes(type))) {
    return true;
  }

  return eventPath === "/" && typeof body === "string" && body.startsWith("<!DOCTYPE html>");
}

/** The encoding to use from Accept-Encoding: the higher q-value wins, brotli on a tie, q=0 means "not this one". */
export function preferredEncoding(acceptEncoding: string): Encoding | null {
  const quality = new Map<string, number>();
  for (const part of acceptEncoding.toLowerCase().split(",")) {
    const [name = "", ...params] = part.split(";").map((piece) => piece.trim());
    const q = params.find((param) => param.startsWith("q="));
    const value = q === undefined ? 1 : Number(q.slice(2));
    quality.set(name, Number.isFinite(value) ? value : 0);
  }

  const br = quality.get("br") ?? 0;
  const gzip = quality.get("gzip") ?? 0;
  if (br > 0 && br >= gzip) return "br";
  return gzip > 0 ? "gzip" : null;
}

/**
 * The text h3 will send for this body. API handlers return plain objects and lists, which h3 turns into
 * JSON only after this hook, so they used to go out uncompressed. Anything else (streams, errors) is left alone.
 */
function bodyText(event: H3Event, body: unknown): { text: string | Buffer; json: boolean } | null {
  if (typeof body === "string" || Buffer.isBuffer(body)) return { text: body, json: false };
  if (body === null || typeof body !== "object") return null;

  const prototype = Object.getPrototypeOf(body);
  if (!Array.isArray(body) && prototype !== Object.prototype && prototype !== null) return null;
  return { text: JSON.stringify(body), json: !getResponseHeader(event, "content-type") };
}

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("beforeResponse", (event, response) => {
    if (event.method === "HEAD" || getResponseHeader(event, "content-encoding")) {
      return;
    }

    // Nuxt renders error pages in a nested /__nuxt_error request and copies its headers,
    // but not the compressed body, so browsers failed to decode every 404/500 page.
    if (event.path.startsWith("/__nuxt_error")) {
      return;
    }

    const body = bodyText(event, response.body);
    if (!body) {
      return;
    }

    const source = Buffer.isBuffer(body.text) ? body.text : Buffer.from(body.text);
    if (source.byteLength < MIN_COMPRESS_BYTES) {
      return;
    }

    const contentType = body.json ? "application/json" : String(getResponseHeader(event, "content-type") || "").toLowerCase();
    if (!isCompressible(event.path, contentType, body.text)) {
      return;
    }

    const encoding = preferredEncoding(String(getRequestHeader(event, "accept-encoding") || ""));
    if (!encoding) {
      return;
    }

    // h3 sends a Buffer as it is, without the JSON content type it would have set itself.
    if (body.json) setResponseHeader(event, "content-type", "application/json");
    response.body = encoding === "br" ? brotliCompressSync(source, { params: { [constants.BROTLI_PARAM_QUALITY]: 5 } }) : gzipSync(source, { level: 6 });
    setResponseHeader(event, "content-encoding", encoding);
    appendResponseHeader(event, "vary", "accept-encoding");
    removeResponseHeader(event, "content-length");
  });
});
