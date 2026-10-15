import bcrypt from "bcryptjs";
import { getSessionUser } from "~/server/utils/auth";
import { getAdminDatabase } from "~/server/utils/database";
import { isDemoAccount } from "~/server/utils/demo";
import { deleteUserSessions, getSessionToken, limitAttempt } from "~/server/utils/session";
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
  if (isDemoAccount(currentUser.username)) {
    throw createError({ statusCode: 403, statusMessage: "In der Demo lässt sich das Passwort nicht ändern" });
  }

  const body = await readBody<{ currentPassword: string; newPassword: string }>(event);

  if (!body?.currentPassword || typeof body.currentPassword !== "string") {
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

  // A stolen session must not become an unlimited oracle for the account password.
  const currentPassword = body.currentPassword;
  const isCurrentValid = await limitAttempt(
    [{ key: `password-change:${currentUser.userId}`, resetOnSuccess: true }],
    async () => (await bcrypt.compare(currentPassword, user.password_hash)) || null
  );
  if (!isCurrentValid) {
    throw createError({ statusCode: 401, statusMessage: "Passwort-Änderung fehlgeschlagen" });
  }

  const hashedNewPassword = await bcrypt.hash(body.newPassword, getPasswordHashCost());
  // A changed password ends all other sessions, so a leaked one stops working everywhere.
  db.transaction(() => {
    db.prepare("UPDATE users SET password_hash = ? WHERE user_id = ?").run(hashedNewPassword, currentUser.userId);
    deleteUserSessions(currentUser.userId, getSessionToken(event));
  })();

  return { success: true };
});
