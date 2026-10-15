import { DEVICE_NAME_MAX_LENGTH, MemberAccessService } from "~/server/services/member-access.service";
import { memberLoginResponse } from "~/server/utils/member-login";
import { getClientNetwork, limitAttempt } from "~/server/utils/session";
import { readJsonBody } from "~/server/utils/json-body";

export default defineEventHandler(async (event) => {
  const body = await readJsonBody<{ code: unknown; deviceName: unknown; client: unknown }>(event);
  const code = typeof body?.code === "string" ? body.code : "";
  const deviceName =
    typeof body?.deviceName === "string" ? body.deviceName.trim().slice(0, DEVICE_NAME_MAX_LENGTH) || null : null;

  // Own bucket, like the team code, so typos never lock out planners.
  const result = await limitAttempt([{ key: `member:${getClientNetwork(event)}` }], () =>
    code && code.length <= 32 ? MemberAccessService.redeem(code, deviceName) : null
  );
  if (!result) {
    throw createError({
      statusCode: 401,
      statusMessage: "Der QR-Code ist ungültig, abgelaufen oder wurde schon benutzt",
    });
  }

  return memberLoginResponse(event, result, body?.client);
});
