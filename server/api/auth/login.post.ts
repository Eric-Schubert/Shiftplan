import { getAdminDatabase } from "~/server/utils/database";
import {
  createSession,
  checkRateLimit,
  recordFailedLogin,
  resetRateLimit,
  getClientIP,
} from "~/server/utils/session";
import type { SessionUser, UserWithHash } from "~/types/auth";
import {
  getAuthConfig,
  getMaxPasswordLength,
  getSessionCookieMaxAgeSeconds,
  getUserValidationConfig,
} from "~/server/config/auth-config";
import bcrypt from "bcryptjs";
import type { LoginRequest, LoginResponse } from "~/types/api";

export default defineEventHandler(async (event) => {
  const ip = getClientIP(event);


  const rateLimit = checkRateLimit(ip);

  if (!rateLimit.allowed) {
    throw createError({
      statusCode: 429,
      statusMessage: `Zu viele Anmeldeversuche. Bitte warten.`,
    });
  }


  const body = await readBody<LoginRequest>(event);

  if (!body.username || typeof body.username !== "string") {
    throw createError({
      statusCode: 400,
      statusMessage: "Benutzername erforderlich",
    });
  }

  if (!body.password || typeof body.password !== "string") {
    throw createError({
      statusCode: 400,
      statusMessage: "Passwort erforderlich",
    });
  }

  if (
    body.responseMode !== undefined &&
    body.responseMode !== "cookie" &&
    body.responseMode !== "token"
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: "Ungueltiger Antwortmodus",
    });
  }

  const responseMode = body.responseMode || "cookie";

  const username = body.username.trim();
  const userConfig = getUserValidationConfig();
  if (username.length < userConfig.usernameMinLength || username.length > userConfig.usernameMaxLength) {
    throw createError({
      statusCode: 400,
      statusMessage: "UngÃ¼ltige Zugangsdaten",
    });
  }


  if (body.password.length > getMaxPasswordLength()) {
    throw createError({
      statusCode: 400,
      statusMessage: "Passwort zu lang",
    });
  }


  const db = getAdminDatabase();
  const user = db
    .prepare(
      "SELECT user_id, username, role, active, created_at, password_hash FROM users WHERE username = ? AND active = 1"
    )
    .get(username) as UserWithHash | undefined;

  const isValid = user
    ? await bcrypt.compare(body.password, user.password_hash)
    : false;

  if (!isValid) {

    recordFailedLogin(ip);


    throw createError({
      statusCode: 401,
      statusMessage: "Anmeldung fehlgeschlagen",
    });
  }


  resetRateLimit(ip);


  const sessionUser: SessionUser = {
    userId: user!.user_id,
    username: user!.username,
    role: user!.role,
  };
  const { sessionToken, csrfToken, expiresAt } = createSession(sessionUser);
  const cookieConfig = getAuthConfig().session.cookies;
  const cookieMaxAge = getSessionCookieMaxAgeSeconds();

  if (responseMode === "token") {
    return {
      success: true,
      user: sessionUser,
      tokenType: "Bearer",
      sessionToken,
      expiresAt: new Date(expiresAt).toISOString(),
    } satisfies LoginResponse;
  }


  setCookie(event, cookieConfig.sessionName, sessionToken, {
    httpOnly: true,
    secure: cookieConfig.secureInProduction && process.env.NODE_ENV === "production",
    sameSite: cookieConfig.sameSite,
    maxAge: cookieMaxAge,
    path: cookieConfig.path,
  });


  setCookie(event, cookieConfig.csrfName, csrfToken, {
    httpOnly: false,
    secure: cookieConfig.secureInProduction && process.env.NODE_ENV === "production",
    sameSite: cookieConfig.sameSite,
    maxAge: cookieMaxAge,
    path: cookieConfig.path,
  });


  return {
    success: true,
    user: sessionUser,
  } satisfies LoginResponse;
});
