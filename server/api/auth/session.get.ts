import {
  getSessionData,
  getSessionToken,
  getCsrfToken,
  isBearerSessionRequest,
} from "~/server/utils/session";
import type { AuthSessionResponse } from "~/types/api";

export default defineEventHandler((event) => {
  const token = getSessionToken(event);
  const user = getSessionData(token);

  if (!user) {
    return { authenticated: false } satisfies AuthSessionResponse;
  }

  return {
    authenticated: true,
    user,


    csrfToken: isBearerSessionRequest(event) ? null : getCsrfToken(token),
  } satisfies AuthSessionResponse;
});
