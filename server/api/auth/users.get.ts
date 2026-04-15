import { getAdminDatabase } from "~/server/utils/database";
import { requireAdmin } from "~/server/utils/auth";
import type { User } from "~/types/auth";

export default defineEventHandler((event) => {
  requireAdmin(event);

  const db = getAdminDatabase();
  const users = db
    .prepare("SELECT user_id, username, role, active, created_at FROM users ORDER BY user_id")
    .all() as User[];

  return users;
});
