import {
  ACCESS_CODE_MAX_LENGTH,
  ACCESS_CODE_MIN_LENGTH,
  INSTANCE_NAME_MAX_LENGTH,
  TeamAccessService,
} from "~/server/services/team-access.service";
import { requireAdmin } from "~/server/utils/auth";
import { validateString } from "~/server/utils/validation";
import { apiError, messageRef } from "~/server/utils/api-error";
import { isAppLocale } from "~/i18n/config";

export default defineEventHandler(async (event) => {
  requireAdmin(event);

  const body = await readBody<{
    code?: unknown;
    generate?: unknown;
    instanceName?: unknown;
    nextWeekFromSaturday?: unknown;
    instanceLocale?: unknown;
  }>(event);

  if (body?.instanceName !== undefined) {
    const instanceName = validateString(body.instanceName, "name", {
      required: true,
      maxLength: INSTANCE_NAME_MAX_LENGTH,
    });
    TeamAccessService.setInstanceName(instanceName);
    return { instanceName };
  }

  if (body?.nextWeekFromSaturday !== undefined) {
    if (typeof body.nextWeekFromSaturday !== "boolean") {
      throw apiError(event, 400, "errors.team.nextWeekFromSaturdayBoolean");
    }
    TeamAccessService.setNextWeekFromSaturday(body.nextWeekFromSaturday);
    return { nextWeekFromSaturday: TeamAccessService.getNextWeekFromSaturday() };
  }

  if (body?.instanceLocale !== undefined) {
    if (!isAppLocale(body.instanceLocale)) throw apiError(event, 400, "errors.team.localeUnknown");
    TeamAccessService.setInstanceLocale(body.instanceLocale);
    return { instanceLocale: TeamAccessService.getInstanceLocale() };
  }

  if (body?.code === null) {
    TeamAccessService.setAccessCode(null);
    return { code: null };
  }

  const code =
    body?.generate === true
      ? TeamAccessService.generateCode()
      : validateString(body?.code, "accessCode", {
          required: true,
          minLength: ACCESS_CODE_MIN_LENGTH,
          maxLength: ACCESS_CODE_MAX_LENGTH,
          pattern: /^\S+$/,
          patternMessage: messageRef("errors.team.codeWhitespace"),
        });

  TeamAccessService.setAccessCode(code);
  return { code: TeamAccessService.getAccessCode() };
});
