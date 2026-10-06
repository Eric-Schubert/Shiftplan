import { AbsenceService } from "~/server/services/absence.service";
import { MemberAccessService } from "~/server/services/member-access.service";
import { cancelAbsence } from "~/server/utils/absence-flow";
import { validateId } from "~/server/utils/validation";

export default defineEventHandler((event) => {
  const member = MemberAccessService.requireMember(event);
  const absence = AbsenceService.getById(validateId(getRouterParam(event, "id"), "id"));

  if (!absence || absence.staff_id !== member.staffId) {
    throw createError({ statusCode: 404, statusMessage: "Ausfall nicht gefunden" });
  }

  const cancelled = cancelAbsence(
    absence,
    { userId: 0, username: member.staffName, source: "app" },
    getQuery(event).range === "1"
  );
  return { success: true, cancelled };
});
