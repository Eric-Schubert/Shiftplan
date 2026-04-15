import { getAdminDatabase } from "~/server/utils/database";
import bcrypt from "bcryptjs";

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 256;
const REQUIRE_UPPERCASE = true;
const REQUIRE_LOWERCASE = true;
const REQUIRE_NUMBER = true;

function validatePasswordStrength(password: string): { valid: boolean; message: string } {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { valid: false, message: `Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen haben` };
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return { valid: false, message: `Passwort darf maximal ${MAX_PASSWORD_LENGTH} Zeichen haben` };
  }
  if (REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
    return { valid: false, message: "Passwort muss mindestens einen Großbuchstaben enthalten" };
  }
  if (REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
    return { valid: false, message: "Passwort muss mindestens einen Kleinbuchstaben enthalten" };
  }
  if (REQUIRE_NUMBER && !/[0-9]/.test(password)) {
    return { valid: false, message: "Passwort muss mindestens eine Zahl enthalten" };
  }
  return { valid: true, message: "" };
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{ currentPassword: string; newPassword: string }>(event);

  if (!body.currentPassword || typeof body.currentPassword !== "string") {
    throw createError({ statusCode: 400, statusMessage: "Aktuelles Passwort erforderlich" });
  }
  if (!body.newPassword || typeof body.newPassword !== "string") {
    throw createError({ statusCode: 400, statusMessage: "Neues Passwort erforderlich" });
  }

  // DoS-Schutz: bcrypt ist absichtlich langsam
  if (body.currentPassword.length > MAX_PASSWORD_LENGTH) {
    throw createError({ statusCode: 400, statusMessage: "Passwort zu lang" });
  }

  const strength = validatePasswordStrength(body.newPassword);
  if (!strength.valid) {
    throw createError({ statusCode: 400, statusMessage: strength.message });
  }

  const db = getAdminDatabase();
  const setting = db
    .prepare("SELECT value FROM settings WHERE key = 'admin_password'")
    .get() as { value: string } | undefined;

  if (!setting) {
    throw createError({ statusCode: 500, statusMessage: "Admin-Passwort nicht konfiguriert" });
  }

  const isCurrentValid = await bcrypt.compare(body.currentPassword, setting.value);
  if (!isCurrentValid) {
    throw createError({ statusCode: 401, statusMessage: "Passwort-Änderung fehlgeschlagen" });
  }

  const hashedNewPassword = await bcrypt.hash(body.newPassword, 12);
  db.prepare("UPDATE settings SET value = ? WHERE key = 'admin_password'").run(hashedNewPassword);

  return { success: true };
});
