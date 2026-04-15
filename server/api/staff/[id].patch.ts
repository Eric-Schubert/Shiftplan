import { StaffService } from "~/server/services/staff.service";
import { validateName, validateBoolean, validateId } from "~/server/utils/validation";

export default defineEventHandler(async (event) => {
  const id = validateId(getRouterParam(event, "id"), "ID");
  const body = await readBody(event);

  // Input-Validierung (alle optional bei PATCH)
  const name = validateName(body.name, "Name", { maxLength: 100 });
  const active = validateBoolean(body.active, "Aktiv");
  const is_parttime = validateBoolean(body.is_parttime, "Teilzeit");

  // Mindestens ein Feld muss gesetzt sein
  if (name === undefined && active === undefined && is_parttime === undefined) {
    throw createError({ statusCode: 400, statusMessage: "Keine Änderungen angegeben" });
  }

  const updated = StaffService.update(id, {
    ...(name !== undefined && { name }),
    ...(active !== undefined && { active }),
    ...(is_parttime !== undefined && { is_parttime }),
  });

  if (!updated) {
    throw createError({ statusCode: 404, statusMessage: "Nicht gefunden" });
  }

  return updated;
});
