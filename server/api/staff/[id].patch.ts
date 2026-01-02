import { StaffService } from "~/server/services/staff.service";
import type { StaffUpdateDTO } from "~/types/staff";
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, "id"));
  if (isNaN(id)) throw createError({ statusCode: 400, statusMessage: "Ungültige ID" });
  const body = await readBody<StaffUpdateDTO>(event);
  const updated = StaffService.update(id, body);
  if (!updated) throw createError({ statusCode: 404, statusMessage: "Nicht gefunden" });
  return updated;
});
