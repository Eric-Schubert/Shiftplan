import { getSessionData, getSessionToken, getCsrfToken } from "~/server/utils/session";

export default defineEventHandler((event) => {
  const token = getSessionToken(event);
  const user = getSessionData(token);

  if (!user) {
    return { authenticated: false };
  }

  return {
    authenticated: true,
    user,
    // CSRF-Token nur zurückgeben wenn Session gültig ist
    // (Frontend braucht es nach Page-Refresh)
    csrfToken: getCsrfToken(token),
  };
});
