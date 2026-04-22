import bcrypt from "bcryptjs";
import type { UserRole } from "~/types/auth";
import { requireAdmin } from "~/server/utils/auth";
import { getAdminDatabase } from "~/server/utils/database";
import { validatePasswordStrength } from "~/utils/password-policy";

export default defineEventHandler(async (event) => {
  requireAdmin(event);

  const body = await readBody<{
    username: string;
    password: string;
    role: UserRole;
  }>(event);

  if (!body.username || !body.password || !body.role) {
    throw createError({
      statusCode: 400,
      statusMessage: "Benutzername, Passwort und Rolle erforderlich",
    });
  }

  const username = body.username.trim();
  if (username.length < 3) {
    throw createError({
      statusCode: 400,
      statusMessage: "Benutzername muss mindestens 3 Zeichen haben",
    });
  }

  const strength = validatePasswordStrength(body.password);
  if (!strength.valid) {
    throw createError({
      statusCode: 400,
      statusMessage: strength.message,
    });
  }

  if (!["admin", "planner"].includes(body.role)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Ungültige Rolle. Erlaubt: admin, planner",
    });
  }

  const db = getAdminDatabase();
  const existing = db
    .prepare("SELECT user_id FROM users WHERE username = ?")
    .get(username);

  if (existing) {
    throw createError({
      statusCode: 409,
      statusMessage: "Benutzername bereits vergeben",
    });
  }

  const passwordHash = await bcrypt.hash(body.password, 12);
  const result = db
    .prepare(
      "INSERT INTO users (username, password_hash, role, active, created_at) VALUES (?, ?, ?, 1, datetime('now'))"
    )
    .run(username, passwordHash, body.role);

  return {
    success: true,
    user_id: result.lastInsertRowid,
    username,
    role: body.role,
  };
});
