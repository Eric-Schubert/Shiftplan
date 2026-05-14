import { destroySession, getSessionToken } from "~/server/utils/session";
import { getAuthConfig } from "~/server/config/auth-config";

export default defineEventHandler((event) => {
  const token = getSessionToken(event);


  destroySession(token);


  const cookieConfig = getAuthConfig().session.cookies;
  deleteCookie(event, cookieConfig.sessionName, { path: cookieConfig.path });


  deleteCookie(event, cookieConfig.csrfName, { path: cookieConfig.path });

  return { success: true };
});
