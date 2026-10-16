import { StaffService } from "~/server/services/staff.service";
import { requireAdmin } from "~/server/utils/auth";
import { validateName, validateBoolean, validateId } from "~/server/utils/validation";
import { apiError } from "~/server/utils/api-error";

export default defineEventHandler(async (event) => {
  requireAdmin(event);

  const id = validateId(getRouterParam(event, "id"), "recordId");
  const body = await readBody(event);

  const name = validateName(body.name, "name", { maxLength: 100 });
  const active = validateBoolean(body.active, "active");
  const isPartTime = validateBoolean(body.is_parttime, "partTime");
  const shortCode = typeof body.short_code === "string" ? body.short_code : undefined;

  if (name === undefined && active === undefined && isPartTime === undefined && shortCode === undefined) {
    throw apiError(event, 400, "errors.common.noChanges");
  }

  const updated = StaffService.update(id, {
    ...(name !== undefined && { name }),
    ...(active !== undefined && { active }),
    ...(isPartTime !== undefined && { is_parttime: isPartTime }),
    ...(shortCode !== undefined && { short_code: shortCode }),
  });

  if (!updated) {
    throw apiError(event, 404, "errors.common.notFound");
  }

  return updated;
});
