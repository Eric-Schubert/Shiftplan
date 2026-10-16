import {
  ABSENCE_ADMIN_MAX_DAYS,
  ABSENCE_MESSAGE_MAX_LENGTH,
  ABSENCE_REASONS,
  reportAbsence,
  type AbsenceReason,
} from "~/server/services/absence.service";
import { requirePlanner } from "~/server/utils/auth";
import { requestSource } from "~/server/utils/session";
import { validateId, validateString } from "~/server/utils/validation";
import { apiError } from "~/server/utils/api-error";
import { readObjectBody } from "~/server/utils/json-body";

export default defineEventHandler(async (event) => {
  const user = requirePlanner(event);
  const body = await readObjectBody(event);

  if (!ABSENCE_REASONS.includes(body?.reason)) {
    throw apiError(event, 400, "errors.absences.invalidReason");
  }
  const shiftId = body?.shiftId === undefined || body?.shiftId === null ? null : validateId(body.shiftId, "shiftId");

  const result = await reportAbsence({
    staffId: validateId(body?.staffId, "staffId"),
    // `date` is the single-day field of older clients.
    from: body?.from ?? body?.date,
    to: body?.to ?? null,
    shiftId,
    reason: body.reason as AbsenceReason,
    note: validateString(body?.note, "note", { maxLength: 200 }) ?? null,
    notifyTeam: body?.notifyTeam === true,
    message: validateString(body?.message, "extraText", { maxLength: ABSENCE_MESSAGE_MAX_LENGTH }) ?? null,
    maxDays: user.role === "admin" ? ABSENCE_ADMIN_MAX_DAYS : undefined,
    actor: { userId: user.userId, username: user.username, source: requestSource(event) },
  });

  return { ...result, absence: result.absences[0] };
});
