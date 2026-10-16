import bcrypt from "bcryptjs";
import { getSessionUser } from "~/server/utils/auth";
import { getAdminDatabase } from "~/server/utils/database";
import { isDemoAccount } from "~/server/utils/demo";
import { deleteUserSessions, getSessionToken, limitAttempt } from "~/server/utils/session";
import {
  getMaxPasswordLength,
  getPasswordHashCost,
  passwordPolicyError,
} from "~/server/config/auth-config";
import { apiError } from "~/server/utils/api-error";

export default defineEventHandler(async (event) => {
  const currentUser = getSessionUser(event);
  if (!currentUser) {
    throw apiError(event, 401, "errors.auth.loginRequired");
  }
  if (isDemoAccount(currentUser.username)) {
    throw apiError(event, 403, "errors.auth.demoPassword");
  }

  const body = await readBody<{ currentPassword: string; newPassword: string }>(event);

  if (!body?.currentPassword || typeof body.currentPassword !== "string") {
    throw apiError(event, 400, "errors.auth.currentPasswordRequired");
  }
  if (!body.newPassword || typeof body.newPassword !== "string") {
    throw apiError(event, 400, "errors.auth.newPasswordRequired");
  }

  if (body.currentPassword.length > getMaxPasswordLength()) {
    throw apiError(event, 400, "errors.auth.passwordTooLong");
  }

  const weakPassword = passwordPolicyError(event, body.newPassword);
  if (weakPassword) throw weakPassword;

  const db = getAdminDatabase();
  const user = db
    .prepare("SELECT password_hash FROM users WHERE user_id = ? AND active = 1")
    .get(currentUser.userId) as { password_hash: string } | undefined;

  if (!user) {
    throw apiError(event, 401, "errors.auth.loginRequired");
  }

  // A stolen session must not become an unlimited oracle for the account password.
  const currentPassword = body.currentPassword;
  const isCurrentValid = await limitAttempt(
    [{ key: `password-change:${currentUser.userId}`, resetOnSuccess: true }],
    async () => (await bcrypt.compare(currentPassword, user.password_hash)) || null
  );
  if (!isCurrentValid) {
    throw apiError(event, 401, "errors.auth.passwordChangeFailed");
  }

  const hashedNewPassword = await bcrypt.hash(body.newPassword, getPasswordHashCost());
  // A changed password ends all other sessions, so a leaked one stops working everywhere.
  db.transaction(() => {
    db.prepare("UPDATE users SET password_hash = ? WHERE user_id = ?").run(hashedNewPassword, currentUser.userId);
    deleteUserSessions(currentUser.userId, getSessionToken(event));
  })();

  return { success: true };
});
