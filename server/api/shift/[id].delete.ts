import { ShiftService } from "~/server/services/shift.service";

export default defineEventHandler((event) => {
  const id = Number(getRouterParam(event, "id"));

  if (isNaN(id)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Ungültige ID",
    });
  }

  const deleted = ShiftService.delete(id);

  if (!deleted) {
    throw createError({
      statusCode: 404,
      statusMessage: "Schicht nicht gefunden",
    });
  }

  return { success: true, id };
});
