import bcrypt from "bcryptjs";
import type { UserRole } from "~/types/auth";
import { requireAdmin } from "~/server/utils/auth";
import { getAdminDatabase } from "~/server/utils/database";
import { getPasswordHashCost, getUserValidationConfig, passwordPolicyError } from "~/server/config/auth-config";
import { apiError } from "~/server/utils/api-error";

export default defineEventHandler(async (event) => {
  requireAdmin(event);

  const body = await readBody<{
    username: string;
    password: string;
    role: UserRole;
  }>(event);

  if (!body.username || !body.password || !body.role) {
    throw apiError(event, 400, "errors.auth.userFieldsRequired");
  }

  const username = body.username.trim();
  const userConfig = getUserValidationConfig();
  if (username.length < userConfig.usernameMinLength || username.length > userConfig.usernameMaxLength) {
    throw apiError(event, 400, "errors.auth.usernameLength", {
      min: userConfig.usernameMinLength,
      max: userConfig.usernameMaxLength,
    });
  }

  const weakPassword = passwordPolicyError(event, body.password);
  if (weakPassword) throw weakPassword;

  if (!["admin", "planner"].includes(body.role)) {
    throw apiError(event, 400, "errors.auth.invalidRole");
  }

  const db = getAdminDatabase();
  const existing = db.prepare("SELECT user_id FROM users WHERE username = ?").get(username);

  if (existing) {
    throw apiError(event, 409, "errors.auth.usernameTaken");
  }

  const passwordHash = await bcrypt.hash(body.password, getPasswordHashCost());
  const result = db
    .prepare("INSERT INTO users (username, password_hash, role, active, created_at) VALUES (?, ?, ?, 1, datetime('now'))")
    .run(username, passwordHash, body.role);

  return {
    success: true,
    user_id: result.lastInsertRowid,
    username,
    role: body.role,
  };
});
