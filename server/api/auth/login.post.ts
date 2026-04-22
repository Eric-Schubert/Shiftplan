import { getAdminDatabase } from "~/server/utils/database";
import {
  createSession,
  checkRateLimit,
  recordFailedLogin,
  resetRateLimit,
  getClientIP,
} from "~/server/utils/session";
import type { SessionUser, UserWithHash } from "~/types/auth";
import { MAX_PASSWORD_LENGTH } from "~/utils/password-policy";
import bcrypt from "bcryptjs";

export default defineEventHandler(async (event) => {
  const ip = getClientIP(event);

  // ============================================
  // RATE LIMITING
  // ============================================
  const rateLimit = checkRateLimit(ip);

  if (!rateLimit.allowed) {
    throw createError({
      statusCode: 429,
      statusMessage: `Zu viele Anmeldeversuche. Bitte warten.`,
    });
  }

  // ============================================
  // INPUT VALIDATION
  // ============================================
  const body = await readBody<{ username: string; password: string }>(event);

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

  const username = body.username.trim();
  if (username.length < 3 || username.length > 100) {
    throw createError({
      statusCode: 400,
      statusMessage: "UngÃ¼ltige Zugangsdaten",
    });
  }

  // Passwort-Länge begrenzen (verhindert DoS über bcrypt mit extrem langen Strings)
  if (body.password.length > MAX_PASSWORD_LENGTH) {
    throw createError({
      statusCode: 400,
      statusMessage: "Passwort zu lang",
    });
  }

  // ============================================
  // PASSWORD CHECK
  // ============================================
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
    // Fehlversuch registrieren
    recordFailedLogin(ip);

    // Generische Fehlermeldung — keine Details über verbleibende Versuche
    throw createError({
      statusCode: 401,
      statusMessage: "Anmeldung fehlgeschlagen",
    });
  }

  // ============================================
  // LOGIN ERFOLGREICH
  // ============================================

  // Rate Limit zurücksetzen
  resetRateLimit(ip);

  // Session erstellen (inkl. CSRF-Token)
  const sessionUser: SessionUser = {
    userId: user!.user_id,
    username: user!.username,
    role: user!.role,
  };
  const { sessionToken, csrfToken } = createSession(sessionUser);

  // Session-Cookie setzen (HttpOnly — nicht per JS lesbar)
  setCookie(event, "session_token", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 30 * 60, // 30 Minuten
    path: "/",
  });

  // CSRF-Token als separates, JS-lesbares Cookie
  // (NICHT httpOnly — Frontend muss es lesen können um es als Header zu senden)
  setCookie(event, "csrf_token", csrfToken, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 30 * 60,
    path: "/",
  });

  // NUR success zurückgeben — KEIN Token im Body!
  return {
    success: true,
    user: sessionUser,
  };
});
