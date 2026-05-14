import { getSessionToken, getSessionData } from "~/server/utils/session";
import type { UserRole, SessionUser } from "~/types/auth";




export function getSessionUser(event: any): SessionUser | null {
  const token = getSessionToken(event);
  return getSessionData(token);
}




export function requireRole(event: any, allowedRoles: UserRole[]): SessionUser {
  const user = getSessionUser(event);

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Nicht autorisiert - Bitte einloggen",
    });
  }

  if (!allowedRoles.includes(user.role)) {
    throw createError({
      statusCode: 403,
      statusMessage: "Keine Berechtigung für diese Aktion",
    });
  }

  return user;
}




export function requireAdmin(event: any): SessionUser {
  return requireRole(event, ["admin"]);
}




export function requirePlanner(event: any): SessionUser {
  return requireRole(event, ["admin", "planner"]);
}
