import { ShiftService } from "~/server/services/shift.service";
import { requireAdmin } from "~/server/utils/auth";
import {
  validateName,
  validateTime,
  validateColor,
  validateInteger,
} from "~/server/utils/validation";

export default defineEventHandler(async (event) => {
  requireAdmin(event);

  const body = await readBody(event);

  // Input-Validierung
  const name = validateName(body.name, "Name", { required: true, maxLength: 100 });
  const start_time = validateTime(body.start_time, "Startzeit", { required: true });
  const end_time = validateTime(body.end_time, "Endzeit", { required: true });
  const color = validateColor(body.color, "Farbe");
  const min_staff = validateInteger(body.min_staff, "Min. Mitarbeiter", { min: 0, max: 50 });
  const sort_order = validateInteger(body.sort_order, "Sortierung", { min: 0, max: 999 });

  const shift = ShiftService.create({
    name: name!,
    start_time: start_time!,
    end_time: end_time!,
    color: color ?? "#6366f1",
    min_staff: min_staff ?? 1,
    sort_order: sort_order ?? 0,
  });

  return shift;
});
