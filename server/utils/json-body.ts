import type { H3Event } from "h3";
import { apiError } from "~/server/utils/api-error";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * The request body as a JSON object. No body, `null`, a list, a bare value or broken JSON is a 400,
 * so handlers can read `body.name` without a TypeError turning bad input into a 500.
 */
export async function readObjectBody<T extends object = Record<string, any>>(event: H3Event): Promise<Partial<T>> {
  let body: unknown;
  try {
    body = await readBody(event);
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode !== 400) throw error;
  }
  if (!isRecord(body)) {
    throw apiError(event, 400, "errors.common.bodyObject");
  }
  return body as Partial<T>;
}

/**
 * Body of a public sign-in request, JSON only. A form on another site can post form or text
 * data cross-site but not JSON, so it cannot sign a visitor's browser into a foreign account.
 */
export async function readJsonBody<T extends object>(event: H3Event): Promise<Partial<T>> {
  const contentType = getHeader(event, "content-type") ?? "";
  if (!/^application\/json\s*(;|$)/i.test(contentType.trim())) {
    throw apiError(event, 415, "errors.common.jsonRequired");
  }
  return readObjectBody<T>(event);
}
