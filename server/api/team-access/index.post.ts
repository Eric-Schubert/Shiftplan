import {
  ACCESS_CODE_MAX_LENGTH,
  ACCESS_CODE_MIN_LENGTH,
  INSTANCE_NAME_MAX_LENGTH,
  TeamAccessService,
} from "~/server/services/team-access.service";
import { requireAdmin } from "~/server/utils/auth";
import { validateString } from "~/server/utils/validation";

export default defineEventHandler(async (event) => {
  requireAdmin(event);

  const body = await readBody<{ code?: unknown; generate?: unknown; instanceName?: unknown }>(event);

  if (body?.instanceName !== undefined) {
    const instanceName = validateString(body.instanceName, "Name", {
      required: true,
      maxLength: INSTANCE_NAME_MAX_LENGTH,
    })!;
    TeamAccessService.setInstanceName(instanceName);
    return { instanceName };
  }

  if (body?.code === null) {
    TeamAccessService.setAccessCode(null);
    return { code: null };
  }

  const code =
    body?.generate === true
      ? TeamAccessService.generateCode()
      : validateString(body?.code, "Zugangscode", {
          required: true,
          minLength: ACCESS_CODE_MIN_LENGTH,
          maxLength: ACCESS_CODE_MAX_LENGTH,
          pattern: /^\S+$/,
          patternMessage: "Zugangscode darf keine Leerzeichen enthalten",
        })!;

  TeamAccessService.setAccessCode(code);
  return { code: TeamAccessService.getAccessCode() };
});
