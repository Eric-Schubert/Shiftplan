/** Browser session of a staff member signed in with Kürzel and PIN. */
export const MEMBER_COOKIE_NAME = "member_token";
export const MEMBER_COOKIE_DAYS = 365;

function getBearerToken(event: any): string | undefined {
  const header = getHeader(event, "authorization");
  return header?.startsWith("Bearer ") ? header.slice(7) : undefined;
}

/** The app sends its token as Bearer header, a signed-in browser sends the cookie. */
export function getMemberToken(event: any): { token: string; viaCookie: boolean } | null {
  const bearer = getBearerToken(event);
  if (bearer) return { token: bearer, viaCookie: false };
  const cookie = getCookie(event, MEMBER_COOKIE_NAME);
  return cookie ? { token: cookie, viaCookie: true } : null;
}

/** Audit source of a member action: the browser signs in with a cookie, the app with a token. */
export function memberSource(event: any): "web" | "app" {
  return getMemberToken(event)?.viaCookie ? "web" : "app";
}
