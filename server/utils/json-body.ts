import { apiError } from "~/server/utils/api-error";
/**
 * Body of a public sign-in request, JSON only. A form on another site can post form or text
 * data cross-site but not JSON, so it cannot sign a visitor's browser into a foreign account.
 */
export async function readJsonBody<T>(event: any): Promise<Partial<T> | undefined> {
  const contentType = getHeader(event, "content-type") ?? "";
  if (!/^application\/json\s*(;|$)/i.test(contentType.trim())) {
    throw apiError(event, 415, "errors.common.jsonRequired");
  }
  return readBody<Partial<T>>(event);
}
