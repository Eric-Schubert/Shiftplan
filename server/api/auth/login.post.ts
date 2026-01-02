import { getAdminDatabase } from "~/server/utils/database";
import bcrypt from "bcryptjs";

export default defineEventHandler(async (event) => {
  const body = await readBody<{ password: string }>(event);

  if (!body.password) {
    throw createError({
      statusCode: 400,
      statusMessage: "Passwort erforderlich",
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

  // Passwort mit bcrypt vergleichen
  const isValid = await bcrypt.compare(body.password, setting.value);

  return { success: isValid };
});
