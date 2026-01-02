import { ShiftService } from "~/server/services/shift.service";
import type { ShiftUpdateDTO } from "~/types/shift";

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, "id"));

  if (isNaN(id)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Ungültige ID",
    });
  }

  const body = await readBody<ShiftUpdateDTO>(event);
  const updated = ShiftService.update(id, body);

  if (!updated) {
    throw createError({
      statusCode: 404,
      statusMessage: "Schicht nicht gefunden",
    });
  }

  return updated;
});
