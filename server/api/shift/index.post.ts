import { ShiftService } from "~/server/services/shift.service";
import type { ShiftCreateDTO } from "~/types/shift";
export default defineEventHandler(async (event) => {
  const body = await readBody<ShiftCreateDTO>(event);
  if (!body.name || !body.start_time || !body.end_time) {
    throw createError({ statusCode: 400, statusMessage: "Name, Startzeit und Endzeit erforderlich" });
  }
  return ShiftService.create(body);
});
