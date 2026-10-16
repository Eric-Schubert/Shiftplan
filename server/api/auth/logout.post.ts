import { clearSessionCookies, destroySession, getSessionToken } from "~/server/utils/session";

// Needs no CSRF token (see server/config/route-policy.ts), so a stale tab can always sign out.
export default defineEventHandler((event) => {
  destroySession(getSessionToken(event));
  clearSessionCookies(event);
  return { success: true };
});
