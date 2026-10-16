import { PushService } from "~/server/services/push.service";
import { TeamAccessService } from "~/server/services/team-access.service";
import { MemberAccessService } from "~/server/services/member-access.service";
import { apiError } from "~/server/utils/api-error";

export default defineEventHandler(async (event) => {
  if (!TeamAccessService.hasReadAccess(event)) {
    throw apiError(event, 401, "errors.team.codeRequired");
  }

  PushService.subscribe(await readBody(event), MemberAccessService.getMember(event));
  return { success: true };
});
