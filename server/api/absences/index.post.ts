import { ABSENCE_REASONS, type AbsenceReason } from "~/server/services/absence.service";
import { reportAbsence, requestSource } from "~/server/utils/absence-flow";
import { ABSENCE_MESSAGE_MAX_LENGTH } from "~/server/utils/absence-notice";
import { requirePlanner } from "~/server/utils/auth";
import { validateId, validateString } from "~/server/utils/validation";

export default defineEventHandler(async (event) => {
  const user = requirePlanner(event);
  const body = await readBody(event);

  if (!ABSENCE_REASONS.includes(body?.reason)) {
    throw createError({ statusCode: 400, statusMessage: "Ungültiger Grund" });
  }
  const shiftId = body?.shiftId === undefined || body?.shiftId === null ? null : validateId(body.shiftId, "shiftId");

  const result = await reportAbsence({
    staffId: validateId(body?.staffId, "staffId"),
    date: body?.date,
    shiftId,
    reason: body.reason as AbsenceReason,
    note: validateString(body?.note, "Notiz", { maxLength: 200 }) ?? null,
    requireAssignment: false,
    notifyTeam: body?.notifyTeam === true,
    message: validateString(body?.message, "Zusatztext", { maxLength: ABSENCE_MESSAGE_MAX_LENGTH }) ?? null,
    actor: { userId: user.userId, username: user.username, source: requestSource(event) },
  });

  return result;
});
