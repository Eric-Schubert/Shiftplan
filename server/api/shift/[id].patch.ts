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
import { apiError } from "~/server/utils/api-error";

export default defineEventHandler(async (event) => {
  requireAdmin(event);

  const id = validateId(getRouterParam(event, "id"), "recordId");
  const body = await readBody(event);
  const shiftConfig = getShiftValidationConfig();


  const name = validateName(body.name, "name", { maxLength: 100 });
  const active = validateBoolean(body.active, "active");
  const startTime = validateTime(body.start_time, "startTime");
  const endTime = validateTime(body.end_time, "endTime");
  const color = validateColor(body.color, "color");
  const minStaff = validateInteger(body.min_staff, "minStaff", {
    min: shiftConfig.minStaff.min,
    max: shiftConfig.minStaff.max,
  });
  const sortOrder = validateInteger(body.sort_order, "sortOrder", {
    min: shiftConfig.sortOrder.min,
    max: shiftConfig.sortOrder.max,
  });

  const updated = ShiftService.update(id, {
    ...(name !== undefined && { name }),
    ...(active !== undefined && { active }),
    ...(startTime !== undefined && { start_time: startTime }),
    ...(endTime !== undefined && { end_time: endTime }),
    ...(color !== undefined && { color }),
    ...(minStaff !== undefined && { min_staff: minStaff }),
    ...(sortOrder !== undefined && { sort_order: sortOrder }),
  });

  if (!updated) {
    throw apiError(event, 404, "errors.common.notFound");
  }

  return updated;
});
