import { AbsenceService, cancelAbsence } from "~/server/services/absence.service";
import { requirePlanner } from "~/server/utils/auth";
import { requestSource } from "~/server/utils/session";
import { validateId } from "~/server/utils/validation";

export default defineEventHandler((event) => {
  const user = requirePlanner(event);
  const absence = AbsenceService.getById(validateId(getRouterParam(event, "id"), "id"));
  if (!absence) {
    throw createError({ statusCode: 404, statusMessage: "Ausfall nicht gefunden" });
  }

  const cancelled = cancelAbsence(
    absence,
    { userId: user.userId, username: user.username, source: requestSource(event) },
    { wholeRange: getQuery(event).range === "1" }
  );
  return { success: true, cancelled };
});
