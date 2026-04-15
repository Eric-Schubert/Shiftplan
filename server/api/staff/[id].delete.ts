import { StaffService } from "~/server/services/staff.service";
import { requireAdmin } from "~/server/utils/auth";
import { validateId } from "~/server/utils/validation";

export default defineEventHandler((event) => {
  requireAdmin(event);

  const id = validateId(getRouterParam(event, "id"), "ID");

  const deleted = StaffService.delete(id);
  if (!deleted) {
    throw createError({ statusCode: 404, statusMessage: "Nicht gefunden" });
  }

  return { success: true, id };
});
