import type { PlainHandler, PlainResponse } from "h3";
import backendConfig from "../../config/backend.config.json";

export type CookieJar = Map<string, string>;
export type RequestOptions = {
  body?: unknown;
  jar?: CookieJar;
  csrf?: boolean;
  headers?: Record<string, string>;
};
export type ApiRequest = <T = any>(
  method: string,
  path: string,
  options?: RequestOptions
) => Promise<PlainResponse & { json: T | null }>;

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

/** Sends JSON requests like a browser: cookies from the jar, CSRF header on request. */
export function requestWithCookies(handler: PlainHandler, defaultHeaders: Record<string, string> = {}): ApiRequest {
  return async (method, requestPath, options = {}) => {
    const headers: Record<string, string> = { ...defaultHeaders, ...options.headers };
    if (options.jar && options.jar.size > 0) {
      headers.cookie = [...options.jar.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
    }
    if (options.body !== undefined) headers["content-type"] = "application/json";
    if (options.csrf && options.jar?.get(csrfCookieName)) {
      headers["x-csrf-token"] = options.jar.get(csrfCookieName)!;
    }
    const response = await handler({
      method,
      path: requestPath,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    updateCookieJar(options.jar, response);
    return { ...response, json: parseBody(response.body) };
  };
}
