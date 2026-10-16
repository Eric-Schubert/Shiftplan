import { MemberAccessService } from "~/server/services/member-access.service";
import { REQUEST_MESSAGE_MAX_LENGTH, requestSwap, requestTakeover } from "~/server/services/shift-request.service";
import { validateId, validateString } from "~/server/utils/validation";
import { apiError } from "~/server/utils/api-error";

/** A staff member asks the team to take over a shift, or a colleague to swap a range. */
export default defineEventHandler(async (event) => {
  const member = MemberAccessService.requireMember(event);
  const body = await readBody(event);
  const message = validateString(body?.message, "message", { maxLength: REQUEST_MESSAGE_MAX_LENGTH }) ?? null;

  if (body?.kind === "takeover") {
    const shiftId = body?.shiftId === undefined || body?.shiftId === null ? null : validateId(body.shiftId, "shiftId");
    const request = await requestTakeover({
      staffId: member.staffId,
      staffName: member.staffName,
      date: body?.date,
      shiftId,
      message,
    });
    return { request };
  }

  if (body?.kind === "swap") {
    const request = await requestSwap({
      staffId: member.staffId,
      staffName: member.staffName,
      partnerStaffId: validateId(body?.partnerStaffId, "partnerStaffId"),
      from: body?.from,
      to: body?.to,
      message,
    });
    return { request };
  }

  throw apiError(event, 400, "errors.requests.kindInvalid");
});
