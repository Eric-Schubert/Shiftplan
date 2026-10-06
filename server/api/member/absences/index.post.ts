import { MemberAccessService } from "~/server/services/member-access.service";
import { ABSENCE_REASONS, type AbsenceReason } from "~/server/services/absence.service";
import { reportAbsence } from "~/server/utils/absence-flow";
import { ABSENCE_MESSAGE_MAX_LENGTH } from "~/server/utils/absence-notice";
import { validateString } from "~/server/utils/validation";

export default defineEventHandler(async (event) => {
  const member = MemberAccessService.requireMember(event);
  const body = await readBody(event);

  if (!ABSENCE_REASONS.includes(body?.reason)) {
    throw createError({ statusCode: 400, statusMessage: "Ungültiger Grund" });
  }
  const shiftId = body?.shiftId === undefined || body?.shiftId === null ? null : Number(body.shiftId);
  if (shiftId !== null && !Number.isInteger(shiftId)) {
    throw createError({ statusCode: 400, statusMessage: "Ungültige Schicht" });
  }

  const result = await reportAbsence({
    staffId: member.staffId,
    from: body?.from ?? body?.date,
    to: body?.to ?? null,
    shiftId,
    reason: body.reason as AbsenceReason,
    notifyTeam: body?.notifyTeam !== false,
    message: validateString(body?.message, "Zusatztext", { maxLength: ABSENCE_MESSAGE_MAX_LENGTH }) ?? null,
    actor: { userId: 0, username: member.staffName, source: "app" },
  });

  const absences = result.absences.map((absence) => ({ ...absence, note: undefined }));
  return { absences, absence: absences[0], skipped: result.skipped, notified: result.notified };
});
