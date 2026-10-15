import { getAuthConfig } from "~/server/config/auth-config";
import {
  ACCESS_CODE_MAX_LENGTH,
  TeamAccessService,
  VIEWER_COOKIE_NAME,
  VIEWER_SESSION_DAYS,
} from "~/server/services/team-access.service";
import { getClientNetwork, limitAttempt } from "~/server/utils/session";
import { readJsonBody } from "~/server/utils/json-body";

export default defineEventHandler(async (event) => {
  const body = await readJsonBody<{ code: unknown; client: unknown }>(event);
  const isApp = body?.client === "app";

  if (!TeamAccessService.isCodeRequired()) {
    return isApp ? { success: true, token: null, expiresAt: null } : { success: true };
  }

  const code = typeof body?.code === "string" ? body.code : "";

  // Own bucket, so mistyped team codes in a shared office network never lock out planners.
  const valid = await limitAttempt([{ key: `viewer:${getClientNetwork(event)}` }], () =>
    code && code.length <= ACCESS_CODE_MAX_LENGTH && TeamAccessService.verifyCode(code) ? true : null
  );
  if (!valid) {
    throw createError({
      statusCode: 401,
      statusMessage: "Zugangscode ist falsch",
    });
  }

  const session = TeamAccessService.createViewerSession();

  // The app keeps the token in secure storage and sends it as Bearer header.
  if (isApp) {
    return { success: true, token: session.token, expiresAt: session.expiresAt };
  }

  const cookieConfig = getAuthConfig().session.cookies;
  // Lax so links from messengers or QR scanners open the plan directly.
  setCookie(event, VIEWER_COOKIE_NAME, session.token, {
    httpOnly: true,
    secure: cookieConfig.secureInProduction && process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: VIEWER_SESSION_DAYS * 24 * 60 * 60,
    path: cookieConfig.path,
  });

  return { success: true };
});
