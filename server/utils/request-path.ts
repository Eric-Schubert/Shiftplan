import type { H3Event } from "h3";

/**
 * The path Nitro's router dispatches on, without the query. h3 has already percent-decoded it.
 * Middleware must decide on this path, not on the raw request target from getRequestURL:
 * `/%61pi/staff` does not look like `/api/` there, but the router still serves it as `/api/staff`.
 */
export function routedPath(event: H3Event): string {
  const path = event.path || "/";
  const query = path.indexOf("?");
  return query === -1 ? path : path.slice(0, query);
}
