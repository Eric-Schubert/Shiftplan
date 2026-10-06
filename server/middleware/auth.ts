import {
  validateSession,
  getSessionToken,
  validateCsrfToken,
  getCsrfTokenFromRequest,
} from "~/server/utils/session";
import { getAuthConfig } from "~/server/config/auth-config";
import { TeamAccessService } from "~/server/services/team-access.service";

// Employee routes without a planner login. They check the team access code themselves.
const TEAM_ROUTES = [
  "/api/instance",
  "/api/viewer/login",
  "/api/viewer/logout",
  "/api/viewer/status",
  "/api/push/subscribe",
  "/api/push/unsubscribe",
  "/api/push/devices",
];

// Personal app access: these handlers authenticate the staff member themselves.
const MEMBER_PREFIX = "/api/member/";

// Plan data read by employees, gated like the configured plan routes.
const BUILTIN_READ_PREFIXES = ["/api/absences"];


function isPublicGetRoute(path: string): boolean {
  return getAuthConfig().routes.publicGetPrefixes.some(
    (prefix) => path === prefix || path.startsWith(prefix + "/")
  );
}

export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname;
  const method = getMethod(event);


  if (!path.startsWith("/api/")) {
    return;
  }


  if (getAuthConfig().routes.public.includes(path)) {
    return;
  }


  if (TEAM_ROUTES.includes(path) || path.startsWith(MEMBER_PREFIX)) {
    return;
  }


  const isBuiltinRead = BUILTIN_READ_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(prefix + "/")
  );
  if (method === "GET" && (isPublicGetRoute(path) || isBuiltinRead)) {
    if (
      (isBuiltinRead || TeamAccessService.isProtectedReadRoute(path)) &&
      !TeamAccessService.hasReadAccess(event)
    ) {
      throw createError({
        statusCode: 401,
        statusMessage: "Zugangscode erforderlich",
      });
    }
    return;
  }


  const token = getSessionToken(event);
  const isValid = validateSession(token);

  if (!isValid) {
    throw createError({
      statusCode: 401,
      statusMessage: "Nicht autorisiert - Bitte einloggen",
    });
  }


  // CSRF protects ambient cookies. A Bearer token is sent explicitly by the app.
  const usesBearer = getHeader(event, "authorization")?.startsWith("Bearer ") ?? false;
  if (!usesBearer && getAuthConfig().routes.csrfMethods.includes(method)) {
    const csrfToken = getCsrfTokenFromRequest(event);
    const csrfValid = validateCsrfToken(token, csrfToken);

    if (!csrfValid) {
      throw createError({
        statusCode: 403,
        statusMessage: "Ungültiger Sicherheitstoken - Bitte Seite neu laden",
      });
    }
  }


});
