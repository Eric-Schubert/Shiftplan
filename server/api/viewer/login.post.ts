import { getAuthConfig } from "~/server/config/auth-config";
import {
  ACCESS_CODE_MAX_LENGTH,
  TeamAccessService,
  VIEWER_COOKIE_NAME,
  VIEWER_SESSION_DAYS,
} from "~/server/services/team-access.service";
import {
  checkRateLimit,
  getClientIP,
  recordFailedLogin,
  resetRateLimit,
} from "~/server/utils/session";

export default defineEventHandler(async (event) => {
  if (!TeamAccessService.isCodeRequired()) {
    return { success: true };
  }

  // Own bucket, so mistyped team codes in a shared office network never lock out planners.
  const rateLimitKey = `viewer:${getClientIP(event)}`;
  if (!checkRateLimit(rateLimitKey).allowed) {
    throw createError({
      statusCode: 429,
      statusMessage: "Zu viele Versuche. Bitte warten.",
    });
  }

  const body = await readBody<{ code?: unknown }>(event);
  const code = typeof body?.code === "string" ? body.code : "";

  if (!code || code.length > ACCESS_CODE_MAX_LENGTH || !TeamAccessService.verifyCode(code)) {
    recordFailedLogin(rateLimitKey);
    throw createError({
      statusCode: 401,
      statusMessage: "Zugangscode ist falsch",
    });
  }

  resetRateLimit(rateLimitKey);

  const cookieConfig = getAuthConfig().session.cookies;
  // Lax so links from messengers or QR scanners open the plan directly.
  setCookie(event, VIEWER_COOKIE_NAME, TeamAccessService.createViewerSession(), {
    httpOnly: true,
    secure: cookieConfig.secureInProduction && process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: VIEWER_SESSION_DAYS * 24 * 60 * 60,
    path: cookieConfig.path,
  });

  return { success: true };
});
