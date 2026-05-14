import { getAdminDatabase } from "~/server/utils/database";
import { requireAdmin } from "~/server/utils/auth";

export default defineEventHandler((event) => {
  const currentUser = requireAdmin(event);

  const id = Number(getRouterParam(event, "id"));

  if (!id || isNaN(id)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Ungültige User-ID",
    });
  }


  if (id === currentUser.userId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Du kannst dich nicht selbst löschen",
    });
  }

  const db = getAdminDatabase();


  const user = db
    .prepare("SELECT role FROM users WHERE user_id = ?")
    .get(id) as { role: string } | undefined;

  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: "Benutzer nicht gefunden",
    });
  }

  if (user.role === "admin") {
    const adminCount = db
      .prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND active = 1")
      .get() as { count: number };

    if (adminCount.count <= 1) {
      throw createError({
        statusCode: 400,
        statusMessage: "Der letzte Admin kann nicht gelöscht werden",
      });
    }
  }

  db.prepare("DELETE FROM users WHERE user_id = ?").run(id);

  return { success: true };
});
