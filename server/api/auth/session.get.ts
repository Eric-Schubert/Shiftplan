import { getSessionData, getSessionToken, getCsrfToken, refreshSessionCookies } from "~/server/utils/session";

export default defineEventHandler((event) => {
  const token = getSessionToken(event);
  const user = getSessionData(token);

  if (!user) {
    return { authenticated: false };
  }

  // The client calls this while the planner is active, which keeps the cookies alive.
  refreshSessionCookies(event);

  return {
    authenticated: true,
    user,
    csrfToken: getCsrfToken(token),
  };
});
