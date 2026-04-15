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
      statusMessage: `Zu viele Anmeldeversuche. Bitte warten.`,
    });
  }

  // ============================================
  // INPUT VALIDATION
  // ============================================
  const body = await readBody<{ password: string }>(event);

  if (!body.password || typeof body.password !== "string") {
    throw createError({
      statusCode: 400,
      statusMessage: "Passwort erforderlich",
    });
  }

  // Passwort-Länge begrenzen (verhindert DoS über bcrypt mit extrem langen Strings)
  if (body.password.length > 256) {
    throw createError({
      statusCode: 400,
      statusMessage: "Passwort zu lang",
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
  const { sessionToken, csrfToken } = createSession();

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
  };
});
