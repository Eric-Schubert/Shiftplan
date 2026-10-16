import { applyDayChange } from "~/server/services/day-change.service";
import { requirePlanner } from "~/server/utils/auth";
import { requestSource } from "~/server/utils/session";
import { validateId } from "~/server/utils/validation";
import { apiError } from "~/server/utils/api-error";

/** Puts someone into or out of a shift for a single day, on top of the weekly plan. */
export default defineEventHandler(async (event) => {
  const user = requirePlanner(event);
  const body = await readBody(event);

  if (typeof body?.present !== "boolean") {
    throw apiError(event, 400, "errors.shiftplan.presentBoolean");
  }
  const staffId = validateId(body?.staff_id, "staff_id");
  const shiftId = validateId(body?.shift_id, "shift_id");
  const source = requestSource(event);

  const changed = applyDayChange({
    staffId,
    shiftId,
    date: body?.date,
    present: body.present,
    actor: { userId: user.userId, username: user.username, source },
    origin: getHeader(event, "origin"),
  });

  return { success: true, changed };
});
