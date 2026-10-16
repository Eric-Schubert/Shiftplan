import { DEVICE_NAME_MAX_LENGTH, MemberAccessService } from "~/server/services/member-access.service";
import { memberLoginResponse } from "~/server/services/member-login.service";
import { getClientNetwork, limitAttempt } from "~/server/utils/session";
import { readJsonBody } from "~/server/utils/json-body";
import { apiError } from "~/server/utils/api-error";

export default defineEventHandler(async (event) => {
  const body = await readJsonBody<{ code: unknown; deviceName: unknown; client: unknown }>(event);
  const code = typeof body?.code === "string" ? body.code : "";
  const deviceName = typeof body?.deviceName === "string" ? body.deviceName.trim().slice(0, DEVICE_NAME_MAX_LENGTH) || null : null;

  // Own bucket, like the team code, so typos never lock out planners. A success clears it:
  // the codes are far too long to guess, but colleagues behind one NAT share the bucket.
  const bucket = { key: `member:${getClientNetwork(event)}`, resetOnSuccess: true };
  const result = await limitAttempt(event, [bucket], () => (code && code.length <= 32 ? MemberAccessService.redeem(code, deviceName) : null));
  if (!result) {
    throw apiError(event, 401, "errors.member.inviteInvalid");
  }

  return memberLoginResponse(event, result, body?.client);
});
