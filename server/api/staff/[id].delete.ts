import { StaffService } from "~/server/services/staff.service";

export default defineEventHandler((event) => {
  const id = Number(getRouterParam(event, "id"));

  if (isNaN(id)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Ungültige ID",
    });
  }

  const deleted = StaffService.delete(id);

  if (!deleted) {
    throw createError({
      statusCode: 404,
      statusMessage: "Mitarbeiter nicht gefunden",
    });
  }

  return { success: true, id };
});
