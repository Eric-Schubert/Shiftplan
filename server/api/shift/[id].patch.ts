import { ShiftService } from "~/server/services/shift.service";
import {
  validateId,
  validateName,
  validateTime,
  validateColor,
  validateInteger,
  validateBoolean,
} from "~/server/utils/validation";

export default defineEventHandler(async (event) => {
  const id = validateId(getRouterParam(event, "id"), "ID");
  const body = await readBody(event);

  // Input-Validierung (alle optional bei PATCH)
  const name = validateName(body.name, "Name", { maxLength: 100 });
  const active = validateBoolean(body.active, "Aktiv");
  const start_time = validateTime(body.start_time, "Startzeit");
  const end_time = validateTime(body.end_time, "Endzeit");
  const color = validateColor(body.color, "Farbe");
  const min_staff = validateInteger(body.min_staff, "Min. Mitarbeiter", { min: 0, max: 50 });
  const sort_order = validateInteger(body.sort_order, "Sortierung", { min: 0, max: 999 });

  const updated = ShiftService.update(id, {
    ...(name !== undefined && { name }),
    ...(active !== undefined && { active }),
    ...(start_time !== undefined && { start_time }),
    ...(end_time !== undefined && { end_time }),
    ...(color !== undefined && { color }),
    ...(min_staff !== undefined && { min_staff }),
    ...(sort_order !== undefined && { sort_order }),
  });

  if (!updated) {
    throw createError({ statusCode: 404, statusMessage: "Nicht gefunden" });
  }

  return updated;
});
