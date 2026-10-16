import type { H3Event } from "h3";
import { getRotationValidationConfig } from "~/server/config/domain-config";
import { apiError } from "~/server/utils/api-error";

// JSON bodies of this API stay far below this. The Excel import gets its file limit plus form overhead.
const MAX_BODY_BYTES = 256 * 1024;
const MULTIPART_OVERHEAD_BYTES = 64 * 1024;
const EXCEL_IMPORT_PATH = "/api/rotation/excel-import";
const PAYLOAD_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function getBodyLimit(path: string): number {
  return path === EXCEL_IMPORT_PATH ? getRotationValidationConfig().excelImportMaxBytes + MULTIPART_OVERHEAD_BYTES : MAX_BODY_BYTES;
}

// The Excel import shows this message as is, so it keeps the wording of the handler's own check.
function tooLarge(event: H3Event, path: string) {
  const excelMegabytes = Math.floor(getRotationValidationConfig().excelImportMaxBytes / 1024 / 1024);
  return path === EXCEL_IMPORT_PATH ? apiError(event, 413, "excel.fileTooLarge", { mb: excelMegabytes }) : apiError(event, 413, "errors.common.tooLarge");
}

/** Buffers a chunked body up to the limit. Beyond it the rest is discarded, never kept. */
function readLimited(event: H3Event, limit: number, path: string): Promise<Buffer<ArrayBuffer>> {
  const request = event.node.req;
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    const onData = (chunk: Buffer) => {
      size += chunk.length;
      if (size <= limit) {
        chunks.push(chunk);
        return;
      }
      request.off("data", onData);
      request.resume();
      reject(tooLarge(event, path));
    };
    request.on("data", onData);
    // Buffer.concat always copies into a fresh, unshared ArrayBuffer.
    request.on("end", () => resolve(Buffer.concat(chunks) as Buffer<ArrayBuffer>));
    request.on("error", reject);
  });
}

/**
 * h3 buffers whole request bodies without a limit, before any handler can check size, auth
 * or rate limits. Node stops a body at its Content-Length, so only chunked bodies are counted.
 */
export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname;
  if (!path.startsWith("/api/") || !PAYLOAD_METHODS.has(getMethod(event))) return;

  const limit = getBodyLimit(path);
  if (Number.parseInt(getHeader(event, "content-length") || "", 10) > limit) throw tooLarge(event, path);
  if (!/\bchunked\b/i.test(getHeader(event, "transfer-encoding") || "")) return;

  // h3's body readers use this buffer instead of the already consumed stream.
  event._requestBody = await readLimited(event, limit, path);
});
