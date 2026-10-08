import { DEVICE_NAME_MAX_LENGTH, MemberAccessService } from "~/server/services/member-access.service";
import { memberLoginResponse } from "~/server/utils/member-login";
import { checkRateLimit, getClientIP, recordFailedLogin, resetRateLimit } from "~/server/utils/session";

export default defineEventHandler(async (event) => {
  // Own bucket, like the team code, so typos never lock out planners.
  const rateLimitKey = `member:${getClientIP(event)}`;
  if (!checkRateLimit(rateLimitKey).allowed) {
    throw createError({ statusCode: 429, statusMessage: "Zu viele Versuche. Bitte warten." });
  }

  const body = await readBody<{ code?: unknown; deviceName?: unknown; client?: unknown }>(event);
  const code = typeof body?.code === "string" ? body.code : "";
  const deviceName =
    typeof body?.deviceName === "string" ? body.deviceName.trim().slice(0, DEVICE_NAME_MAX_LENGTH) || null : null;

  const result = code && code.length <= 32 ? MemberAccessService.redeem(code, deviceName) : null;
  if (!result) {
    recordFailedLogin(rateLimitKey);
    throw createError({
      statusCode: 401,
      statusMessage: "Der QR-Code ist ungültig, abgelaufen oder wurde schon benutzt",
    });
  }

  resetRateLimit(rateLimitKey);
  return memberLoginResponse(event, result, body?.client);
});
