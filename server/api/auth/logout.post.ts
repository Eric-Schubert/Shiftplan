import { destroySession, getSessionToken } from "~/server/utils/session";

export default defineEventHandler((event) => {
  const token = getSessionToken(event);

  // Session serverseitig löschen
  destroySession(token);

  // Session-Cookie löschen
  deleteCookie(event, "session_token", { path: "/" });

  // CSRF-Cookie löschen
  deleteCookie(event, "csrf_token", { path: "/" });

  return { success: true };
});
