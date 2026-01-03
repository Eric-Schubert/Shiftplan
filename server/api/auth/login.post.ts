import { getAdminDatabase } from "~/server/utils/database";
import {
  createSession,
  checkRateLimit,
  recordFailedLogin,
  resetRateLimit,
  getClientIP,
} from "~/server/utils/session";
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
      statusMessage: `Zu viele Anmeldeversuche. Bitte warte ${rateLimit.blockedForSeconds} Sekunden.`,
    });
  }

  // ============================================
  // INPUT VALIDATION
  // ============================================
  const body = await readBody<{ password: string }>(event);

  if (!body.password) {
    throw createError({
      statusCode: 400,
      statusMessage: "Passwort erforderlich",
    });
  }

  // ============================================
  // PASSWORD CHECK
  // ============================================
  const db = getAdminDatabase();
  const setting = db
    .prepare("SELECT value FROM settings WHERE key = 'admin_password'")
    .get() as { value: string } | undefined;

  if (!setting) {
    throw createError({
      statusCode: 500,
      statusMessage: "Admin-Passwort nicht konfiguriert",
    });
  }

  const isValid = await bcrypt.compare(body.password, setting.value);

  if (!isValid) {
    // Fehlversuch registrieren
    recordFailedLogin(ip);

    const remaining = rateLimit.remainingAttempts - 1;
    const message =
      remaining > 0
        ? `Falsches Passwort. Noch ${remaining} Versuche.`
        : "Falsches Passwort. Account temporär gesperrt.";

    throw createError({
      statusCode: 401,
      statusMessage: message,
    });
  }

  // ============================================
  // LOGIN ERFOLGREICH
  // ============================================

  // Rate Limit zurücksetzen
  resetRateLimit(ip);

  // Session erstellen
  const sessionToken = createSession();

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
    token: sessionToken, // Auch im Body für API-Clients
  };
});
