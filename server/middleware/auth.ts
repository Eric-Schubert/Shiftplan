import {
  validateSession,
  getSessionToken,
  validateCsrfToken,
  getCsrfTokenFromRequest,
} from "~/server/utils/session";

// Routen die IMMER öffentlich sind (auch POST/PATCH/DELETE)
const PUBLIC_ROUTES = new Set(["/api/auth/login"]);

// Routen-Prefixe die nur mit GET öffentlich sind
const PUBLIC_GET_PREFIXES = [
  "/api/staff",
  "/api/shift",
  "/api/shiftplan",
  "/api/rotation",
  "/api/holidays",
];

// HTTP-Methoden die CSRF-Schutz brauchen
const CSRF_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

/**
 * Prüft ob ein Pfad zu einem öffentlichen GET-Prefix gehört.
 * Erlaubt nur exakte Treffer oder Pfade die mit / weitergehen.
 * z.B. /api/staff → ✅, /api/staff/1 → ✅, /api/staff-secret → ❌
 */
function isPublicGetRoute(path: string): boolean {
  return PUBLIC_GET_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(prefix + "/")
  );
}

export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname;
  const method = getMethod(event);

  // Keine API-Route? Ignorieren
  if (!path.startsWith("/api/")) {
    return;
  }

  // Komplett öffentliche Routen (exakter Match)
  if (PUBLIC_ROUTES.has(path)) {
    return;
  }

  // GET-Requests auf öffentliche Routen erlauben (sicheres Prefix-Matching)
  if (method === "GET" && isPublicGetRoute(path)) {
    return;
  }

  // Ab hier: Authentifizierung erforderlich
  const token = getSessionToken(event);
  const isValid = validateSession(token);

  if (!isValid) {
    throw createError({
      statusCode: 401,
      statusMessage: "Nicht autorisiert - Bitte einloggen",
    });
  }

  // CSRF-Schutz für state-ändernde Methoden
  if (CSRF_METHODS.has(method)) {
    const csrfToken = getCsrfTokenFromRequest(event);
    const csrfValid = validateCsrfToken(token, csrfToken);

    if (!csrfValid) {
      throw createError({
        statusCode: 403,
        statusMessage: "Ungültiger Sicherheitstoken - Bitte Seite neu laden",
      });
    }
  }

  // Session ist gültig, Request durchlassen
});
