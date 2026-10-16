import type { PlainHandler, PlainResponse } from "h3";
import backendConfig from "../../config/backend.config.json";

export type CookieJar = Map<string, string>;
export type FormFile = { filename: string; data: Buffer };
export type RequestOptions = {
  body?: unknown;
  /** Sent as multipart/form-data instead of a JSON body, like a browser upload. */
  form?: Record<string, string | FormFile>;
  jar?: CookieJar;
  csrf?: boolean;
  headers?: Record<string, string>;
  /** Socket address of the client. Without it every request comes from "unknown" and shares one rate-limit bucket. */
  ip?: string;
};
export type ApiRequest = <T = any>(method: string, path: string, options?: RequestOptions) => Promise<PlainResponse & { json: T | null }>;

const csrfCookieName = backendConfig.auth.session.cookies.csrfName;

function parseBody(body: unknown) {
  const text = Buffer.isBuffer(body) ? body.toString("utf-8") : body;
  if (typeof text !== "string" || text.length === 0) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

const BOUNDARY = "shiftplan-test-boundary";

function multipart(form: Record<string, string | FormFile>): Uint8Array<ArrayBuffer> {
  const parts = Object.entries(form).map(([name, value]) => {
    const file = typeof value === "string" ? null : value;
    const disposition = `form-data; name="${name}"${file ? `; filename="${file.filename}"` : ""}`;
    const head = `--${BOUNDARY}\r\nContent-Disposition: ${disposition}\r\n${file ? "Content-Type: application/octet-stream\r\n" : ""}\r\n`;
    return Buffer.concat([Buffer.from(head), file ? file.data : Buffer.from(value as string), Buffer.from("\r\n")]);
  });
  return new Uint8Array(Buffer.concat([...parts, Buffer.from(`--${BOUNDARY}--\r\n`)]));
}

function updateCookieJar(jar: CookieJar | undefined, response: PlainResponse) {
  if (!jar) return;
  for (const [name, header] of response.headers) {
    if (name.toLowerCase() !== "set-cookie") continue;
    const [pair] = header.split(";");
    const separator = pair?.indexOf("=") ?? -1;
    if (!pair || separator === -1) continue;
    jar.set(pair.slice(0, separator), pair.slice(separator + 1));
  }
}

/** Sends JSON or form requests like a browser: cookies from the jar, CSRF header on request. */
export function requestWithCookies(handler: PlainHandler, defaultHeaders: Record<string, string> = {}): ApiRequest {
  return async (method, requestPath, options = {}) => {
    const headers: Record<string, string> = { ...defaultHeaders, ...options.headers };
    if (options.jar && options.jar.size > 0) {
      headers.cookie = [...options.jar.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
    }
    if (options.body !== undefined) headers["content-type"] ??= "application/json";
    if (options.form) headers["content-type"] = `multipart/form-data; boundary=${BOUNDARY}`;
    if (options.csrf && options.jar?.get(csrfCookieName)) {
      headers["x-csrf-token"] = options.jar.get(csrfCookieName)!;
    }
    const response = await handler({
      method,
      path: requestPath,
      headers,
      body: options.form ? multipart(options.form) : options.body === undefined ? undefined : JSON.stringify(options.body),
      context: options.ip ? { clientAddress: options.ip } : undefined,
    });
    updateCookieJar(options.jar, response);
    return { ...response, json: parseBody(response.body) };
  };
}
