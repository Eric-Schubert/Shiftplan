import { ShiftService } from "~/server/services/shift.service";
import { validateId } from "~/server/utils/validation";

export default defineEventHandler((event) => {
  const id = validateId(getRouterParam(event, "id"), "ID");

  const deleted = ShiftService.delete(id);
  if (!deleted) {
    throw createError({ statusCode: 404, statusMessage: "Nicht gefunden" });
  }

  return { success: true, id };
});
