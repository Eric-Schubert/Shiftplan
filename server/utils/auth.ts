import { getSessionToken, getSessionData } from "~/server/utils/session";
import type { UserRole, SessionUser } from "~/types/auth";

/**
 * Holt den aktuellen Benutzer aus der Session.
 * Gibt null zurück wenn nicht eingeloggt.
 */
export function getSessionUser(event: any): SessionUser | null {
  const token = getSessionToken(event);
  return getSessionData(token);
}

/**
 * Prüft ob der aktuelle Benutzer eine der erlaubten Rollen hat.
 * Wirft 401 wenn nicht eingeloggt, 403 wenn falsche Rolle.
 */
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

/**
 * Prüft ob der aktuelle Benutzer Admin ist.
 * Shortcut für requireRole(event, ['admin'])
 */
export function requireAdmin(event: any): SessionUser {
  return requireRole(event, ["admin"]);
}

/**
 * Prüft ob der aktuelle Benutzer mindestens Planner ist.
 * Shortcut für requireRole(event, ['admin', 'planner'])
 */
export function requirePlanner(event: any): SessionUser {
  return requireRole(event, ["admin", "planner"]);
}
