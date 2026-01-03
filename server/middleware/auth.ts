import { validateSession, getSessionToken } from "~/server/utils/session";

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

  // Session ist gültig, Request durchlassen
});
