import { ShiftService } from "~/server/services/shift.service";
import { requireAdmin } from "~/server/utils/auth";
import {
  validateId,
  validateName,
  validateTime,
  validateColor,
  validateInteger,
  validateBoolean,
} from "~/server/utils/validation";
import { getShiftValidationConfig } from "~/server/config/domain-config";

export default defineEventHandler(async (event) => {
  requireAdmin(event);

  const id = validateId(getRouterParam(event, "id"), "recordId");
  const body = await readBody(event);
  const shiftConfig = getShiftValidationConfig();


  const name = validateName(body.name, "name", { maxLength: 100 });
  const active = validateBoolean(body.active, "active");
  const start_time = validateTime(body.start_time, "startTime");
  const end_time = validateTime(body.end_time, "endTime");
  const color = validateColor(body.color, "color");
  const min_staff = validateInteger(body.min_staff, "minStaff", {
    min: shiftConfig.minStaff.min,
    max: shiftConfig.minStaff.max,
  });
  const sort_order = validateInteger(body.sort_order, "sortOrder", {
    min: shiftConfig.sortOrder.min,
    max: shiftConfig.sortOrder.max,
  });

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
