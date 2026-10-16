import { StaffService } from "~/server/services/staff.service";
import { requireAdmin } from "~/server/utils/auth";
import { validateId } from "~/server/utils/validation";
import { apiError } from "~/server/utils/api-error";

export default defineEventHandler((event) => {
  requireAdmin(event);

  const id = validateId(getRouterParam(event, "id"), "recordId");

  const deleted = StaffService.delete(id);
  if (!deleted) {
    throw apiError(event, 404, "errors.common.notFound");
  }

  return { success: true, id };
});
