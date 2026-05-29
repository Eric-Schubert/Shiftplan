import {
  getSessionData,
  getSessionToken,
  getCsrfToken,
  isBearerSessionRequest,
} from "~/server/utils/session";

export default defineEventHandler((event) => {
  const token = getSessionToken(event);
  const user = getSessionData(token);

  if (!user) {
    return { authenticated: false };
  }

  return {
    authenticated: true,
    user,


    csrfToken: isBearerSessionRequest(event) ? null : getCsrfToken(token),
  };
});
