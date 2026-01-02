import { getAdminDatabase } from "~/server/utils/database";
import bcrypt from "bcryptjs";

export default defineEventHandler(async (event) => {
  const body = await readBody<{ currentPassword: string; newPassword: string }>(event);

  if (!body.currentPassword || !body.newPassword) {
    throw createError({
      statusCode: 400,
      statusMessage: "Aktuelles und neues Passwort erforderlich",
    });
  }

  if (body.newPassword.length < 4) {
    throw createError({
      statusCode: 400,
      statusMessage: "Passwort muss mindestens 4 Zeichen haben",
    });
  }

  const db = getAdminDatabase();
  const setting = db
    .prepare("SELECT value FROM settings WHERE key = 'admin_password'")
    .get() as { value: string } | undefined;

  if (!setting) {
    throw createError({
      statusCode: 500,
      statusMessage: "Admin-Passwort nicht konfiguriert",
    });
  }

  // Aktuelles Passwort mit bcrypt vergleichen
  const isCurrentValid = await bcrypt.compare(body.currentPassword, setting.value);
  if (!isCurrentValid) {
    throw createError({
      statusCode: 401,
      statusMessage: "Aktuelles Passwort ist falsch",
    });
  }

  // Neues Passwort hashen und speichern
  const hashedNewPassword = await bcrypt.hash(body.newPassword, 10);
  db.prepare("UPDATE settings SET value = ? WHERE key = 'admin_password'").run(
    hashedNewPassword
  );

  return { success: true };
});
