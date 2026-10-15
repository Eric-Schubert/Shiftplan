import { getAuthConfig, getSessionCookieMaxAgeSeconds } from "~/server/config/auth-config";
import { getSessionRecord } from "~/server/lib/session/records";

function cookieOptions(httpOnly: boolean) {
  const cookies = getAuthConfig().session.cookies;
  return {
    httpOnly,
    secure: cookies.secureInProduction && process.env.NODE_ENV === "production",
    sameSite: cookies.sameSite,
    maxAge: getSessionCookieMaxAgeSeconds(),
    path: cookies.path,
  };
}

/** The HttpOnly session cookie and the readable CSRF cookie, both with a full lifetime. */
export function setSessionCookies(event: any, sessionToken: string, csrfToken: string): void {
  const cookies = getAuthConfig().session.cookies;
  setCookie(event, cookies.sessionName, sessionToken, cookieOptions(true));
  setCookie(event, cookies.csrfName, csrfToken, cookieOptions(false));
}

export function clearSessionCookies(event: any): void {
  const cookies = getAuthConfig().session.cookies;
  deleteCookie(event, cookies.sessionName, { path: cookies.path });
  deleteCookie(event, cookies.csrfName, { path: cookies.path });
}

/**
 * The server slides a web session on every request, so the cookies have to slide with it.
 * Otherwise the browser drops them a fixed time after sign-in, however active the planner is.
 * Call only after the session was validated.
 */
export function refreshSessionCookies(event: any): void {
  if (!getAuthConfig().session.extendOnActivity) return;
  if (getHeader(event, "authorization")?.startsWith("Bearer ")) return;

  const sessionToken = getCookie(event, getAuthConfig().session.cookies.sessionName);
  const session = getSessionRecord(sessionToken);
  if (sessionToken && session) setSessionCookies(event, sessionToken, session.csrf_token);
}
