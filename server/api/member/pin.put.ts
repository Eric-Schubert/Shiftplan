import { MemberAccessService } from "~/server/services/member-access.service";
import { checkRateLimit, recordFailedLogin, resetRateLimit } from "~/server/utils/session";

/** Sets the personal PIN. Changing an existing PIN needs the current one. */
export default defineEventHandler(async (event) => {
  // Body first, so a person deactivated in the meantime is no longer accepted.
  const body = await readBody<{ pin?: unknown; currentPin?: unknown }>(event);
  const member = MemberAccessService.requireMember(event);

  if (MemberAccessService.hasPin(member.staffId)) {
    const key = `member-pin-change:${member.staffId}`;
    if (!checkRateLimit(key).allowed) {
      throw createError({ statusCode: 429, statusMessage: "Zu viele Versuche. Bitte warten." });
    }
    const currentPin = typeof body?.currentPin === "string" ? body.currentPin.trim() : "";
    if (!MemberAccessService.verifyPin(member.staffId, currentPin)) {
      recordFailedLogin(key);
      throw createError({ statusCode: 403, statusMessage: "Die bisherige PIN stimmt nicht" });
    }
    resetRateLimit(key);
  }

  MemberAccessService.setPin(member.staffId, typeof body?.pin === "string" ? body.pin.trim() : "");
  return { hasPin: true };
});
