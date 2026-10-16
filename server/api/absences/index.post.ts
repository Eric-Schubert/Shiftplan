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

export default defineEventHandler(async (event) => {
  const user = requirePlanner(event);
  const body = await readBody(event);

  if (!ABSENCE_REASONS.includes(body?.reason)) {
    throw createError({ statusCode: 400, statusMessage: "Ungültiger Grund" });
  }
  const shiftId = body?.shiftId === undefined || body?.shiftId === null ? null : validateId(body.shiftId, "shiftId");

  const result = await reportAbsence({
    staffId: validateId(body?.staffId, "staffId"),
    // `date` is the single-day field of older clients.
    from: body?.from ?? body?.date,
    to: body?.to ?? null,
    shiftId,
    reason: body.reason as AbsenceReason,
    note: validateString(body?.note, "Notiz", { maxLength: 200 }) ?? null,
    notifyTeam: body?.notifyTeam === true,
    message: validateString(body?.message, "Zusatztext", { maxLength: ABSENCE_MESSAGE_MAX_LENGTH }) ?? null,
    maxDays: user.role === "admin" ? ABSENCE_ADMIN_MAX_DAYS : undefined,
    actor: { userId: user.userId, username: user.username, source: requestSource(event) },
  });

  return { ...result, absence: result.absences[0] };
});
