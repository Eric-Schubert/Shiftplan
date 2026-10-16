import { StaffService } from "~/server/services/staff.service";
import { requireAdmin } from "~/server/utils/auth";
import { validateName, validateBoolean } from "~/server/utils/validation";

export default defineEventHandler(async (event) => {
  requireAdmin(event);

  const body = await readBody(event);

  const name = validateName(body.name, "name", { required: true, maxLength: 100 });
  const active = validateBoolean(body.active, "active");
  const isPartTime = validateBoolean(body.is_parttime, "partTime");
  const shortCode = typeof body.short_code === "string" && body.short_code.trim() ? body.short_code : undefined;

  const staff = StaffService.create({
    name,
    active: active ?? 1,
    is_parttime: isPartTime ?? 0,
    ...(shortCode !== undefined && { short_code: shortCode }),
  });

  return staff;
});
