import { MemberAccessService } from "~/server/services/member-access.service";
import { REQUEST_MESSAGE_MAX_LENGTH } from "~/server/services/shift-request.service";
import { createSwap, createTakeover } from "~/server/utils/shift-request-flow";
import { validateId, validateString } from "~/server/utils/validation";

/** A staff member asks the team to take over a shift, or a colleague to swap a range. */
export default defineEventHandler(async (event) => {
  const member = MemberAccessService.requireMember(event);
  const body = await readBody(event);
  const message = validateString(body?.message, "Nachricht", { maxLength: REQUEST_MESSAGE_MAX_LENGTH }) ?? null;

  if (body?.kind === "takeover") {
    const shiftId = body?.shiftId === undefined || body?.shiftId === null ? null : validateId(body.shiftId, "shiftId");
    const request = await createTakeover({
      staffId: member.staffId,
      staffName: member.staffName,
      date: body?.date,
      shiftId,
      message,
    });
    return { request };
  }

  if (body?.kind === "swap") {
    const request = await createSwap({
      staffId: member.staffId,
      staffName: member.staffName,
      partnerStaffId: validateId(body?.partnerStaffId, "partnerStaffId"),
      from: body?.from,
      to: body?.to,
      message,
    });
    return { request };
  }

  throw createError({ statusCode: 400, statusMessage: "kind muss takeover oder swap sein" });
});
