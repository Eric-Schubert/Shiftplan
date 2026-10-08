import { DEVICE_NAME_MAX_LENGTH, MemberAccessService } from "~/server/services/member-access.service";
import { memberLoginResponse } from "~/server/utils/member-login";
import { checkRateLimit, getClientIP, recordFailedLogin, resetRateLimit } from "~/server/utils/session";
import { normalizeShortCode } from "~/server/utils/staff-short-code.js";

/** Personal sign-in with Kürzel and PIN, from the browser or the app. */
export default defineEventHandler(async (event) => {
  const body = await readBody<{ shortCode?: unknown; pin?: unknown; deviceName?: unknown; client?: unknown }>(event);
  const shortCode = typeof body?.shortCode === "string" ? normalizeShortCode(body.shortCode).slice(0, 8) : "";
  const pin = typeof body?.pin === "string" ? body.pin.trim() : "";

  // One bucket per network and one per Kürzel, so a PIN can't be guessed from many addresses.
  const ipKey = `member-pin:${getClientIP(event)}`;
  const codeKey = `member-pin-code:${shortCode}`;
  if (!checkRateLimit(ipKey).allowed || (shortCode && !checkRateLimit(codeKey).allowed)) {
    throw createError({ statusCode: 429, statusMessage: "Zu viele Versuche. Bitte warten." });
  }

  const deviceName =
    typeof body?.deviceName === "string" ? body.deviceName.trim().slice(0, DEVICE_NAME_MAX_LENGTH) || null : null;
  const result = shortCode && pin ? MemberAccessService.loginWithPin(shortCode, pin, deviceName) : null;
  if (!result) {
    recordFailedLogin(ipKey);
    if (shortCode) recordFailedLogin(codeKey);
    throw createError({ statusCode: 401, statusMessage: "Kürzel oder PIN stimmt nicht" });
  }

  resetRateLimit(ipKey);
  resetRateLimit(codeKey);
  return memberLoginResponse(event, result, body?.client);
});
