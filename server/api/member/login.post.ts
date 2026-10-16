import { DEVICE_NAME_MAX_LENGTH, MemberAccessService } from "~/server/services/member-access.service";
import { memberLoginResponse } from "~/server/services/member-login.service";
import { getClientNetwork, limitAttempt, type AttemptBucket } from "~/server/utils/session";
import { readJsonBody } from "~/server/utils/json-body";
import { normalizeShortCode } from "~/server/lib/migrations/staff-short-code.js";

// A short code may see more failures than one network, so a stranger alone cannot lock a colleague out.
const SHORT_CODE_ATTEMPTS_FACTOR = 3;

/** Personal sign-in with short code and PIN, from the browser or the app. */
export default defineEventHandler(async (event) => {
  const body = await readJsonBody<{ shortCode: unknown; pin: unknown; deviceName: unknown; client: unknown }>(event);
  const shortCode = typeof body?.shortCode === "string" ? normalizeShortCode(body.shortCode).slice(0, 8) : "";
  const pin = typeof body?.pin === "string" ? body.pin.trim().slice(0, 64) : "";
  const deviceName =
    typeof body?.deviceName === "string" ? body.deviceName.trim().slice(0, DEVICE_NAME_MAX_LENGTH) || null : null;

  // The network bucket brakes guessing; the wider short-code bucket caps guessing from many networks.
  const buckets: AttemptBucket[] = [{ key: `member-pin:${getClientNetwork(event)}` }];
  if (shortCode) {
    buckets.push({ key: `member-pin-code:${shortCode}`, factor: SHORT_CODE_ATTEMPTS_FACTOR, resetOnSuccess: true });
  }
  const result = await limitAttempt(buckets, () =>
    shortCode && pin ? MemberAccessService.loginWithPin(shortCode, pin, deviceName) : null
  );
  if (!result) {
    throw createError({ statusCode: 401, statusMessage: "Kürzel oder PIN stimmt nicht" });
  }

  return memberLoginResponse(event, result, body?.client);
});
