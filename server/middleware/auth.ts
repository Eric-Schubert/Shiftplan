import type { H3Event } from "h3";
import {
  validateSession,
  getSessionToken,
  validateCsrfToken,
  getCsrfTokenFromRequest,
  refreshSessionCookies,
} from "~/server/utils/session";
import { getAuthConfig } from "~/server/config/auth-config";
import { classifyRoute } from "~/server/config/route-policy";
import { TeamAccessService } from "~/server/services/team-access.service";
import { getMemberToken } from "~/server/services/member-access.service";
import { apiError } from "~/server/utils/api-error";

/**
 * A browser signed in with short code and PIN authenticates with a cookie. Writes must then come
 * from this site itself, which the browser states in the Origin header.
 */
function isSameOriginRequest(event: H3Event): boolean {
  const origin = getHeader(event, "origin");
  if (!origin) return false;
  try {
    const xForwardedHost = Boolean(getAuthConfig().trustProxyHeaders);
    return new URL(origin).host === getRequestHost(event, { xForwardedHost });
  } catch {
    return false;
  }
}

// Which class a route belongs to is decided in server/config/route-policy.ts.
export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname;
  const method = getMethod(event);


  if (!path.startsWith("/api/")) {
    return;
  }

  const routeClass = classifyRoute(method, path);


  if (routeClass === "public" || routeClass === "publicRead") {
    return;
  }


  if (routeClass === "team" || routeClass === "member") {
    if (method !== "GET" && getMemberToken(event)?.viaCookie && !isSameOriginRequest(event)) {
      throw apiError(event, 403, "errors.common.badOrigin");
    }
    return;
  }


  if (routeClass === "teamRead") {
    if (!TeamAccessService.hasReadAccess(event)) {
      throw apiError(event, 401, "errors.team.codeRequired");
    }
    return;
  }


  const token = getSessionToken(event);
  const isValid = validateSession(token);

  if (!isValid) {
    throw apiError(event, 401, "errors.auth.loginRequired");
  }


  // CSRF protects ambient cookies. A Bearer token is sent explicitly by the app.
  const usesBearer = getHeader(event, "authorization")?.startsWith("Bearer ") ?? false;
  if (!usesBearer && getAuthConfig().routes.csrfMethods.includes(method)) {
    const csrfToken = getCsrfTokenFromRequest(event);
    const csrfValid = validateCsrfToken(token, csrfToken);

    if (!csrfValid) {
      throw apiError(event, 403, "errors.auth.csrfInvalid");
    }
  }

  refreshSessionCookies(event);
});
