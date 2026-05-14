import bcrypt from "bcryptjs";
import { getSessionUser } from "~/server/utils/auth";
import { getAdminDatabase } from "~/server/utils/database";
import {
  getMaxPasswordLength,
  getPasswordHashCost,
  validateConfiguredPasswordStrength,
} from "~/server/config/auth-config";

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


  if (body.currentPassword.length > getMaxPasswordLength()) {
    throw createError({ statusCode: 400, statusMessage: "Passwort zu lang" });
  }

  const strength = validateConfiguredPasswordStrength(body.newPassword);
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

  const hashedNewPassword = await bcrypt.hash(body.newPassword, getPasswordHashCost());
  db.prepare("UPDATE users SET password_hash = ? WHERE user_id = ?").run(
    hashedNewPassword,
    currentUser.userId
  );

  return { success: true };
});
