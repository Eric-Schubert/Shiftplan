import { MemberAccessService } from "~/server/services/member-access.service";
import { limitAttempt } from "~/server/utils/session";

/** Sets the personal PIN. Changing an existing PIN needs the current one. */
export default defineEventHandler(async (event) => {
  // Body first, so a person deactivated in the meantime is no longer accepted.
  const body = await readBody<{ pin?: unknown; currentPin?: unknown }>(event);
  const member = MemberAccessService.requireMember(event);

  if (MemberAccessService.hasPin(member.staffId)) {
    const currentPin = typeof body?.currentPin === "string" ? body.currentPin.trim() : "";
    const verified = await limitAttempt(
      [{ key: `member-pin-change:${member.staffId}`, resetOnSuccess: true }],
      async () => (await MemberAccessService.verifyPin(member.staffId, currentPin)) || null
    );
    if (!verified) {
      throw createError({ statusCode: 403, statusMessage: "Die bisherige PIN stimmt nicht" });
    }
  }

  await MemberAccessService.setPin(member.staffId, typeof body?.pin === "string" ? body.pin.trim() : "");
  return { hasPin: true };
});
