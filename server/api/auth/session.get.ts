import { validateSession, getSessionToken, getCsrfToken } from "~/server/utils/session";

export default defineEventHandler((event) => {
  const token = getSessionToken(event);
  const isValid = validateSession(token);

  return {
    authenticated: isValid,
    // CSRF-Token nur zurückgeben wenn Session gültig ist
    // (Frontend braucht es nach Page-Refresh)
    ...(isValid ? { csrfToken: getCsrfToken(token) } : {}),
  };
});
