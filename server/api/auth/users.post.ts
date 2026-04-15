import { getAdminDatabase } from "~/server/utils/database";
import { requireAdmin } from "~/server/utils/auth";
import bcrypt from "bcryptjs";
import type { UserRole } from "~/types/auth";

export default defineEventHandler(async (event) => {
  requireAdmin(event);

  const body = await readBody<{
    username: string;
    password: string;
    role: UserRole;
  }>(event);

  // ============================================
  // VALIDATION
  // ============================================
  if (!body.username || !body.password || !body.role) {
    throw createError({
      statusCode: 400,
      statusMessage: "Benutzername, Passwort und Rolle erforderlich",
    });
  }

  if (body.username.length < 3) {
    throw createError({
      statusCode: 400,
      statusMessage: "Benutzername muss mindestens 3 Zeichen haben",
    });
  }

  if (body.password.length < 8) {
    throw createError({
      statusCode: 400,
      statusMessage: "Passwort muss mindestens 8 Zeichen haben",
    });
  }

  if (!["admin", "planner"].includes(body.role)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Ungültige Rolle. Erlaubt: admin, planner",
    });
  }

  // ============================================
  // CHECK DUPLICATE
  // ============================================
  const db = getAdminDatabase();
  const existing = db
    .prepare("SELECT user_id FROM users WHERE username = ?")
    .get(body.username);

  if (existing) {
    throw createError({
      statusCode: 409,
      statusMessage: "Benutzername bereits vergeben",
    });
  }

  // ============================================
  // CREATE USER
  // ============================================
  const passwordHash = await bcrypt.hash(body.password, 12);

  const result = db
    .prepare(
      "INSERT INTO users (username, password_hash, role, active) VALUES (?, ?, ?, 1)"
    )
    .run(body.username, passwordHash, body.role);

  return {
    success: true,
    user_id: result.lastInsertRowid,
    username: body.username,
    role: body.role,
  };
});
