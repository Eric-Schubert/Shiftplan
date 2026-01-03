import { getAdminDatabase } from "~/server/utils/database";
import bcrypt from "bcryptjs";

// Passwort-Policy Konfiguration
const MIN_PASSWORD_LENGTH = 8;
const REQUIRE_UPPERCASE = true;
const REQUIRE_LOWERCASE = true;
const REQUIRE_NUMBER = true;

/**
 * Validiert die Passwort-Stärke
 */
function validatePasswordStrength(password: string): { valid: boolean; message: string } {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      valid: false,
      message: `Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen haben`,
    };
  }

  if (REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
    return {
      valid: false,
      message: "Passwort muss mindestens einen Großbuchstaben enthalten",
    };
  }

  if (REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
    return {
      valid: false,
      message: "Passwort muss mindestens einen Kleinbuchstaben enthalten",
    };
  }

  if (REQUIRE_NUMBER && !/[0-9]/.test(password)) {
    return {
      valid: false,
      message: "Passwort muss mindestens eine Zahl enthalten",
    };
  }

  return { valid: true, message: "" };
}

export default defineEventHandler(async (event) => {
  // HINWEIS: Authentifizierung wird durch server/middleware/auth.ts sichergestellt
  // Dieser Endpoint ist nur erreichbar wenn eine gültige Session existiert

  const body = await readBody<{ currentPassword: string; newPassword: string }>(event);

  // ============================================
  // INPUT VALIDATION
  // ============================================
  if (!body.currentPassword || !body.newPassword) {
    throw createError({
      statusCode: 400,
      statusMessage: "Aktuelles und neues Passwort erforderlich",
    });
  }

  // Passwort-Stärke prüfen
  const strength = validatePasswordStrength(body.newPassword);
  if (!strength.valid) {
    throw createError({
      statusCode: 400,
      statusMessage: strength.message,
    });
  }

  // ============================================
  // CURRENT PASSWORD CHECK
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

  const isCurrentValid = await bcrypt.compare(body.currentPassword, setting.value);
  if (!isCurrentValid) {
    throw createError({
      statusCode: 401,
      statusMessage: "Aktuelles Passwort ist falsch",
    });
  }

  // ============================================
  // UPDATE PASSWORD
  // ============================================
  const hashedNewPassword = await bcrypt.hash(body.newPassword, 12); // Cost Factor erhöht auf 12
  db.prepare("UPDATE settings SET value = ? WHERE key = 'admin_password'").run(
    hashedNewPassword
  );

  return { success: true };
});
