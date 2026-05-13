import { destroySession, getSessionToken } from "~/server/utils/session";
import { getAuthConfig } from "~/server/config/auth-config";

export default defineEventHandler((event) => {
  const token = getSessionToken(event);

  // Session serverseitig löschen
  destroySession(token);

  // Session-Cookie löschen
  const cookieConfig = getAuthConfig().session.cookies;
  deleteCookie(event, cookieConfig.sessionName, { path: cookieConfig.path });

  // CSRF-Cookie löschen
  deleteCookie(event, cookieConfig.csrfName, { path: cookieConfig.path });

  return { success: true };
});
