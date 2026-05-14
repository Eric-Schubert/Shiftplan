import {
  validateSession,
  getSessionToken,
  validateCsrfToken,
  getCsrfTokenFromRequest,
} from "~/server/utils/session";
import { getAuthConfig } from "~/server/config/auth-config";



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


  if (method === "GET" && isPublicGetRoute(path)) {
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


  if (getAuthConfig().routes.csrfMethods.includes(method)) {
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
