import { getSessionToken, getSessionData } from "~/server/utils/session";
import type { UserRole, SessionUser } from "~/types/auth";
import { apiError } from "~/server/utils/api-error";

export function getSessionUser(event: any): SessionUser | null {
  const token = getSessionToken(event);
  return getSessionData(token);
}

function requireRole(event: any, allowedRoles: UserRole[]): SessionUser {
  const user = getSessionUser(event);

  if (!user) {
    throw apiError(event, 401, "errors.auth.loginRequired");
  }

  if (!allowedRoles.includes(user.role)) {
    throw apiError(event, 403, "errors.auth.forbidden");
  }

  return user;
}

export function requireAdmin(event: any): SessionUser {
  return requireRole(event, ["admin"]);
}

export function requirePlanner(event: any): SessionUser {
  return requireRole(event, ["admin", "planner"]);
}
