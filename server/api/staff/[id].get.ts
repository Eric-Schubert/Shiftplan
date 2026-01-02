import { StaffService } from "~/server/services/staff.service";
export default defineEventHandler((event) => {
  const id = Number(getRouterParam(event, "id"));
  if (isNaN(id)) throw createError({ statusCode: 400, statusMessage: "Ungültige ID" });
  const staff = StaffService.getById(id);
  if (!staff) throw createError({ statusCode: 404, statusMessage: "Nicht gefunden" });
  return staff;
});
