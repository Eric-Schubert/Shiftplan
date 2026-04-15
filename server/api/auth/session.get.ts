import { validateSession, getSessionToken, getSessionData } from "~/server/utils/session";

export default defineEventHandler((event) => {
  const token = getSessionToken(event);
  const isValid = validateSession(token);

  if (!isValid) {
    return {
      authenticated: false,
      role: null,
      username: null,
    };
  }

  const sessionData = getSessionData(token);

  return {
    authenticated: true,
    role: sessionData?.role || null,
    username: sessionData?.username || null,
  };
});
