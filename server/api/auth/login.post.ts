import { getAdminDatabase } from "~/server/utils/database";
import {
  createSession,
  checkRateLimit,
  recordFailedLogin,
  resetRateLimit,
  getClientIP,
} from "~/server/utils/session";
import bcrypt from "bcryptjs";
import type { UserWithHash } from "~/types/auth";

export default defineEventHandler(async (event) => {
  const ip = getClientIP(event);

  // ============================================
  // RATE LIMITING
  // ============================================
  const rateLimit = checkRateLimit(ip);

  if (!rateLimit.allowed) {
    throw createError({
      statusCode: 429,
      statusMessage: `Zu viele Anmeldeversuche. Bitte warte ${rateLimit.blockedForSeconds} Sekunden.`,
    });
  }

  // ============================================
  // INPUT VALIDATION
  // ============================================
  const body = await readBody<{ username: string; password: string }>(event);

  if (!body.username || !body.password) {
    throw createError({
      statusCode: 400,
      statusMessage: "Benutzername und Passwort erforderlich",
    });
  }

  // ============================================
  // USER LOOKUP
  // ============================================
  const db = getAdminDatabase();
  const user = db
    .prepare("SELECT * FROM users WHERE username = ? AND active = 1")
    .get(body.username) as UserWithHash | undefined;

  if (!user) {
    // Fehlversuch registrieren (gleiche Meldung wie bei falschem Passwort)
    recordFailedLogin(ip);

    const remaining = rateLimit.remainingAttempts - 1;
    const message =
      remaining > 0
        ? `Ungültige Anmeldedaten. Noch ${remaining} Versuche.`
        : "Ungültige Anmeldedaten. Account temporär gesperrt.";

    throw createError({
      statusCode: 401,
      statusMessage: message,
    });
  }

  // ============================================
  // PASSWORD CHECK
  // ============================================
  const isValid = await bcrypt.compare(body.password, user.password_hash);

  if (!isValid) {
    recordFailedLogin(ip);

    const remaining = rateLimit.remainingAttempts - 1;
    const message =
      remaining > 0
        ? `Ungültige Anmeldedaten. Noch ${remaining} Versuche.`
        : "Ungültige Anmeldedaten. Account temporär gesperrt.";

    throw createError({
      statusCode: 401,
      statusMessage: message,
    });
  }

  // ============================================
  // LOGIN ERFOLGREICH
  // ============================================
  resetRateLimit(ip);

  // Session erstellen mit Benutzerinfo
  const sessionToken = createSession(user.user_id, user.username, user.role);

  // Cookie setzen (HttpOnly für Sicherheit)
  setCookie(event, "session_token", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 30 * 60, // 30 Minuten
    path: "/",
  });

  return {
    success: true,
    token: sessionToken,
    role: user.role,
    username: user.username,
  };
});
