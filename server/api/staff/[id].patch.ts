import { StaffService } from "~/server/services/staff.service";
import { requireAdmin } from "~/server/utils/auth";
import { validateName, validateBoolean, validateId } from "~/server/utils/validation";

export default defineEventHandler(async (event) => {
  requireAdmin(event);

  const id = validateId(getRouterParam(event, "id"), "ID");
  const body = await readBody(event);


  const name = validateName(body.name, "Name", { maxLength: 100 });
  const active = validateBoolean(body.active, "Aktiv");
  const is_parttime = validateBoolean(body.is_parttime, "Teilzeit");
  const short_code = typeof body.short_code === "string" ? body.short_code : undefined;


  if (name === undefined && active === undefined && is_parttime === undefined && short_code === undefined) {
    throw createError({ statusCode: 400, statusMessage: "Keine Änderungen angegeben" });
  }

  const updated = StaffService.update(id, {
    ...(name !== undefined && { name }),
    ...(active !== undefined && { active }),
    ...(is_parttime !== undefined && { is_parttime }),
    ...(short_code !== undefined && { short_code }),
  });

  if (!updated) {
    throw createError({ statusCode: 404, statusMessage: "Nicht gefunden" });
  }

  return updated;
});
