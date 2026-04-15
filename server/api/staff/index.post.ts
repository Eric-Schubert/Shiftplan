import { StaffService } from "~/server/services/staff.service";
import { requireAdmin } from "~/server/utils/auth";
import { validateName, validateBoolean } from "~/server/utils/validation";

export default defineEventHandler(async (event) => {
  requireAdmin(event);

  const body = await readBody(event);

  // Input-Validierung
  const name = validateName(body.name, "Name", { required: true, maxLength: 100 });
  const active = validateBoolean(body.active, "Aktiv");
  const is_parttime = validateBoolean(body.is_parttime, "Teilzeit");

  const staff = StaffService.create({
    name: name!,
    active: active ?? 1,
    is_parttime: is_parttime ?? 0,
  });

  return staff;
});
