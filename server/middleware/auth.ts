import type { H3Event } from "h3";
import { validateSession, getSessionToken, validateCsrfToken, getCsrfTokenFromRequest, refreshSessionCookies } from "~/server/utils/session";
import { getAuthConfig } from "~/server/config/auth-config";
import { classifyRoute } from "~/server/config/route-policy";
import { TeamAccessService, VIEWER_COOKIE_NAME } from "~/server/services/team-access.service";
import { MEMBER_COOKIE_NAME } from "~/server/services/member-access.service";
import { apiError } from "~/server/utils/api-error";
import { routedPath } from "~/server/utils/request-path";

/**
 * Whether a write is carried by a cookie the browser adds on its own: a personal sign-in, the team
 * access code or a planner session. The app sends a Bearer token instead, which no foreign page can set.
 */
function usesAmbientCookie(event: H3Event): boolean {
  if (getHeader(event, "authorization")?.startsWith("Bearer ")) return false;
  const cookies = [MEMBER_COOKIE_NAME, VIEWER_COOKIE_NAME, getAuthConfig().session.cookies.sessionName];
  return cookies.some((name) => Boolean(getCookie(event, name)));
}

/** Writes authorized by such a cookie must come from this site itself, which the browser states in the Origin header. */
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
  // The decoded path the router serves: on the raw request target, /%61pi/... would skip every check below.
  const path = routedPath(event);
  const method = getMethod(event);

  if (!path.startsWith("/api/")) {
    return;
  }

  const routeClass = classifyRoute(method, path);

  if (routeClass === "public" || routeClass === "publicRead") {
    return;
  }

  if (routeClass === "team" || routeClass === "member") {
    if (method !== "GET" && usesAmbientCookie(event) && !isSameOriginRequest(event)) {
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
