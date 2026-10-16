import { getAdminDatabase } from "~/server/utils/database";
import { requireAdmin } from "~/server/utils/auth";
import { deleteUserSessions } from "~/server/utils/session";
import { apiError } from "~/server/utils/api-error";

export default defineEventHandler((event) => {
  const currentUser = requireAdmin(event);

  const id = Number(getRouterParam(event, "id"));

  if (!id || isNaN(id)) {
    throw apiError(event, 400, "errors.auth.invalidUserId");
  }


  if (id === currentUser.userId) {
    throw apiError(event, 400, "errors.auth.cannotDeleteSelf");
  }

  const db = getAdminDatabase();


  const user = db
    .prepare("SELECT role FROM users WHERE user_id = ?")
    .get(id) as { role: string } | undefined;

  if (!user) {
    throw apiError(event, 404, "errors.auth.userNotFound");
  }

  if (user.role === "admin") {
    const adminCount = db
      .prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND active = 1")
      .get() as { count: number };

    if (adminCount.count <= 1) {
      throw apiError(event, 400, "errors.auth.lastAdmin");
    }
  }

  // The account's sessions go with it, so a removed planner or admin is signed out everywhere.
  db.transaction(() => {
    db.prepare("DELETE FROM users WHERE user_id = ?").run(id);
    deleteUserSessions(id);
  })();

  return { success: true };
});
