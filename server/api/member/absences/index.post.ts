import { MemberAccessService, memberSource } from "~/server/services/member-access.service";
import { TeamAccessService } from "~/server/services/team-access.service";
import { ABSENCE_MESSAGE_MAX_LENGTH, ABSENCE_REASONS, reportAbsence, type AbsenceReason } from "~/server/services/absence.service";
import { planningToday } from "~/server/utils/planning-date";
import { validateString } from "~/server/utils/validation";
import { apiError } from "~/server/utils/api-error";

export default defineEventHandler(async (event) => {
  const member = MemberAccessService.requireMember(event);
  const body = await readBody(event);

  if (!ABSENCE_REASONS.includes(body?.reason)) {
    throw apiError(event, 400, "errors.absences.invalidReason");
  }
  const shiftId = body?.shiftId === undefined || body?.shiftId === null ? null : Number(body.shiftId);
  if (shiftId !== null && !Number.isInteger(shiftId)) {
    throw apiError(event, 400, "errors.absences.invalidShift");
  }

  const result = await reportAbsence({
    staffId: member.staffId,
    from: body?.from ?? body?.date,
    to: body?.to ?? null,
    shiftId,
    reason: body.reason as AbsenceReason,
    notifyTeam: body?.notifyTeam !== false,
    seekTakeover: body?.seekTakeover === true,
    message: validateString(body?.message, "extraText", { maxLength: ABSENCE_MESSAGE_MAX_LENGTH }) ?? null,
    // Teams that open next week on Saturday do not work weekends.
    weekdaysOnly: TeamAccessService.getNextWeekFromSaturday(),
    // Like the app and the web form: staff cannot report days that are already over.
    notBefore: planningToday(),
    actor: { userId: 0, username: member.staffName, source: memberSource(event) },
  });

  const absences = result.absences.map((absence) => ({ ...absence, note: undefined }));
  return { absences, absence: absences[0], skipped: result.skipped, notified: result.notified };
});
