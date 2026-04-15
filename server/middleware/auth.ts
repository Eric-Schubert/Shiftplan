import { validateSession, getSessionToken, getSessionData } from "~/server/utils/session";

// Routen die IMMER öffentlich sind (auch POST/PATCH/DELETE)
const PUBLIC_ROUTES = [
  "/api/auth/login",
];

// Routen die nur mit GET öffentlich sind
const PUBLIC_GET_ROUTES = [
  "/api/staff",
  "/api/shift",
  "/api/shiftplan",
  "/api/rotation",
  "/api/holidays",
];

// Mutierende Routen die auch Planner nutzen dürfen
// Alles andere erfordert Admin-Rolle
const PLANNER_ALLOWED_MUTATIONS = [
  "/api/shiftplan/assign",
  "/api/shiftplan/unassign",
  "/api/auth/change-password",
  "/api/auth/logout",
  "/api/auth/session",
];

export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname;
  const method = getMethod(event);

  // Keine API-Route? Ignorieren
  if (!path.startsWith("/api/")) {
    return;
  }

  // Komplett öffentliche Routen
  if (PUBLIC_ROUTES.some((route) => path.startsWith(route))) {
    return;
  }

  // GET-Requests auf öffentliche Routen erlauben
  if (method === "GET" && PUBLIC_GET_ROUTES.some((route) => path.startsWith(route))) {
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

  // Session-Daten an Event-Context anhängen
  const sessionData = getSessionData(token);
  if (sessionData) {
    event.context.user = sessionData;
  }

  // Rollenbasierte Zugriffskontrolle für mutierende Requests
  if (sessionData && sessionData.role === "planner" && method !== "GET") {
    const isAllowed = PLANNER_ALLOWED_MUTATIONS.some((route) => path.startsWith(route));
    if (!isAllowed) {
      throw createError({
        statusCode: 403,
        statusMessage: "Keine Berechtigung für diese Aktion",
      });
    }
  }
});
