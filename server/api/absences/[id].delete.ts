import { AbsenceService } from "~/server/services/absence.service";
import { cancelAbsence, requestSource } from "~/server/utils/absence-flow";
import { requirePlanner } from "~/server/utils/auth";
import { validateId } from "~/server/utils/validation";

export default defineEventHandler((event) => {
  const user = requirePlanner(event);
  const absence = AbsenceService.getById(validateId(getRouterParam(event, "id"), "id"));
  if (!absence) {
    throw createError({ statusCode: 404, statusMessage: "Ausfall nicht gefunden" });
  }

  cancelAbsence(absence, { userId: user.userId, username: user.username, source: requestSource(event) });
  return { success: true };
});
