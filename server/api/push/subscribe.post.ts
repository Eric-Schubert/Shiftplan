import { PushService } from "~/server/services/push.service";
import { TeamAccessService } from "~/server/services/team-access.service";
import { MemberAccessService } from "~/server/services/member-access.service";
import { apiError } from "~/server/utils/api-error";
import { resolveLocale } from "~/server/utils/locale";

export default defineEventHandler(async (event) => {
  if (!TeamAccessService.hasReadAccess(event)) {
    throw apiError(event, 401, "errors.team.codeRequired");
  }

  PushService.subscribe(await readBody(event), MemberAccessService.getMember(event), resolveLocale(event));
  return { success: true };
});
