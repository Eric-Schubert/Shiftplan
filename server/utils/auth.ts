import type { H3Event } from "h3";
import { getSessionToken, getSessionData } from "~/server/utils/session";
import type { UserRole, SessionUser } from "~/types/auth";
import { apiError } from "~/server/utils/api-error";

export function getSessionUser(event: H3Event): SessionUser | null {
  const token = getSessionToken(event);
  return getSessionData(token);
}

function requireRole(event: H3Event, allowedRoles: UserRole[]): SessionUser {
  const user = getSessionUser(event);

  if (!user) {
    throw apiError(event, 401, "errors.auth.loginRequired");
  }

  if (!allowedRoles.includes(user.role)) {
    throw apiError(event, 403, "errors.auth.forbidden");
  }

  return user;
}

export function requireAdmin(event: H3Event): SessionUser {
  return requireRole(event, ["admin"]);
}

export function requirePlanner(event: H3Event): SessionUser {
  return requireRole(event, ["admin", "planner"]);
}
