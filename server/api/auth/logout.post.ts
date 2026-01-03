import { destroySession, getSessionToken } from "~/server/utils/session";

export default defineEventHandler((event) => {
  const token = getSessionToken(event);

  // Session serverseitig löschen
  destroySession(token);

  // Cookie löschen
  deleteCookie(event, "session_token", {
    path: "/",
  });

  return { success: true };
});
