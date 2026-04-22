import bcrypt from "bcryptjs";
import {
  MAX_PASSWORD_LENGTH,
  validatePasswordStrength,
} from "~/utils/password-policy";
import { getSessionUser } from "~/server/utils/auth";
import { getAdminDatabase } from "~/server/utils/database";

export default defineEventHandler(async (event) => {
  const currentUser = getSessionUser(event);
  if (!currentUser) {
    throw createError({ statusCode: 401, statusMessage: "Nicht autorisiert - Bitte einloggen" });
  }

  const body = await readBody<{ currentPassword: string; newPassword: string }>(event);

  if (!body.currentPassword || typeof body.currentPassword !== "string") {
    throw createError({ statusCode: 400, statusMessage: "Aktuelles Passwort erforderlich" });
  }
  if (!body.newPassword || typeof body.newPassword !== "string") {
    throw createError({ statusCode: 400, statusMessage: "Neues Passwort erforderlich" });
  }

  // DoS-Schutz: bcrypt ist absichtlich langsam.
  if (body.currentPassword.length > MAX_PASSWORD_LENGTH) {
    throw createError({ statusCode: 400, statusMessage: "Passwort zu lang" });
  }

  const strength = validatePasswordStrength(body.newPassword);
  if (!strength.valid) {
    throw createError({ statusCode: 400, statusMessage: strength.message });
  }

  const db = getAdminDatabase();
  const user = db
    .prepare("SELECT password_hash FROM users WHERE user_id = ? AND active = 1")
    .get(currentUser.userId) as { password_hash: string } | undefined;

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: "Nicht autorisiert - Bitte einloggen" });
  }

  const isCurrentValid = await bcrypt.compare(body.currentPassword, user.password_hash);
  if (!isCurrentValid) {
    throw createError({ statusCode: 401, statusMessage: "Passwort-Änderung fehlgeschlagen" });
  }

  const hashedNewPassword = await bcrypt.hash(body.newPassword, 12);
  db.prepare("UPDATE users SET password_hash = ? WHERE user_id = ?").run(
    hashedNewPassword,
    currentUser.userId
  );

  return { success: true };
});
