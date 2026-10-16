import { ShiftService } from "~/server/services/shift.service";
import { requireAdmin } from "~/server/utils/auth";
import { validateName, validateTime, validateColor, validateInteger } from "~/server/utils/validation";
import { getShiftDefaults, getShiftValidationConfig } from "~/server/config/domain-config";
import { readObjectBody } from "~/server/utils/json-body";

export default defineEventHandler(async (event) => {
  requireAdmin(event);

  const body = await readObjectBody(event);
  const shiftConfig = getShiftValidationConfig();
  const shiftDefaults = getShiftDefaults();

  const name = validateName(body.name, "name", { required: true, maxLength: 100 });
  const startTime = validateTime(body.start_time, "startTime", { required: true });
  const endTime = validateTime(body.end_time, "endTime", { required: true });
  const color = validateColor(body.color, "color");
  const minStaff = validateInteger(body.min_staff, "minStaff", {
    min: shiftConfig.minStaff.min,
    max: shiftConfig.minStaff.max,
  });
  const sortOrder = validateInteger(body.sort_order, "sortOrder", {
    min: shiftConfig.sortOrder.min,
    max: shiftConfig.sortOrder.max,
  });

  const shift = ShiftService.create({
    name,
    start_time: startTime,
    end_time: endTime,
    color: color ?? shiftDefaults.color,
    min_staff: minStaff ?? shiftDefaults.minStaff,
    sort_order: sortOrder ?? shiftDefaults.sortOrder,
  });

  return shift;
});
