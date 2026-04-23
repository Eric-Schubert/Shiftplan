import { Buffer } from "node:buffer";
import { brotliCompressSync, constants, gzipSync } from "node:zlib";
import {
  appendResponseHeader,
  getRequestHeader,
  getResponseHeader,
  removeResponseHeader,
  setResponseHeader,
} from "h3";

const MIN_COMPRESS_BYTES = 1024;
const TEXT_TYPES = [
  "text/",
  "application/javascript",
  "application/json",
  "application/manifest+json",
  "application/xml",
  "image/svg+xml",
];

function isCompressible(eventPath: string, contentType: string, body: string | Buffer): boolean {
  if (contentType && TEXT_TYPES.some((type) => contentType.includes(type))) {
    return true;
  }

  return eventPath === "/" && typeof body === "string" && body.startsWith("<!DOCTYPE html>");
}

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("beforeResponse", (event, response) => {
    if (event.method === "HEAD" || getResponseHeader(event, "content-encoding")) {
      return;
    }

    if (typeof response.body !== "string" && !Buffer.isBuffer(response.body)) {
      return;
    }

    const source = Buffer.isBuffer(response.body) ? response.body : Buffer.from(response.body);
    if (source.byteLength < MIN_COMPRESS_BYTES) {
      return;
    }

    const contentType = String(getResponseHeader(event, "content-type") || "").toLowerCase();
    if (!isCompressible(event.path, contentType, response.body)) {
      return;
    }

    const acceptEncoding = String(getRequestHeader(event, "accept-encoding") || "");
    if (/\bbr\b/.test(acceptEncoding)) {
      response.body = brotliCompressSync(source, {
        params: {
          [constants.BROTLI_PARAM_QUALITY]: 5,
        },
      });
      setResponseHeader(event, "content-encoding", "br");
    } else if (/\bgzip\b/.test(acceptEncoding)) {
      response.body = gzipSync(source, { level: 6 });
      setResponseHeader(event, "content-encoding", "gzip");
    } else {
      return;
    }

    appendResponseHeader(event, "vary", "accept-encoding");
    removeResponseHeader(event, "content-length");
  });
});
