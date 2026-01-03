import { validateSession, getSessionToken } from "~/server/utils/session";

export default defineEventHandler((event) => {
  const token = getSessionToken(event);
  const isValid = validateSession(token);

  return {
    authenticated: isValid,
  };
});
