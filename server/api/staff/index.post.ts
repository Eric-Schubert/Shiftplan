import { StaffService } from "~/server/services/staff.service";
import type { StaffCreateDTO } from "~/types/staff";
export default defineEventHandler(async (event) => {
  const body = await readBody<StaffCreateDTO>(event);
  if (!body.name) throw createError({ statusCode: 400, statusMessage: "Name ist erforderlich" });
  return StaffService.create(body);
});
