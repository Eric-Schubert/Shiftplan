import { ShiftService } from "~/server/services/shift.service";
import { requireAdmin } from "~/server/utils/auth";
import {
  validateName,
  validateTime,
  validateColor,
  validateInteger,
} from "~/server/utils/validation";
import { getShiftDefaults, getShiftValidationConfig } from "~/server/config/domain-config";

export default defineEventHandler(async (event) => {
  requireAdmin(event);

  const body = await readBody(event);
  const shiftConfig = getShiftValidationConfig();
  const shiftDefaults = getShiftDefaults();


  const name = validateName(body.name, "name", { required: true, maxLength: 100 });
  const start_time = validateTime(body.start_time, "startTime", { required: true });
  const end_time = validateTime(body.end_time, "endTime", { required: true });
  const color = validateColor(body.color, "color");
  const min_staff = validateInteger(body.min_staff, "minStaff", {
    min: shiftConfig.minStaff.min,
    max: shiftConfig.minStaff.max,
  });
  const sort_order = validateInteger(body.sort_order, "sortOrder", {
    min: shiftConfig.sortOrder.min,
    max: shiftConfig.sortOrder.max,
  });

  const shift = ShiftService.create({
    name: name!,
    start_time: start_time!,
    end_time: end_time!,
    color: color ?? shiftDefaults.color,
    min_staff: min_staff ?? shiftDefaults.minStaff,
    sort_order: sort_order ?? shiftDefaults.sortOrder,
  });

  return shift;
});
