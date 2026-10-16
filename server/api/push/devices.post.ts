import { MemberAccessService } from "~/server/services/member-access.service";
import { PushService } from "~/server/services/push.service";
import { TeamAccessService } from "~/server/services/team-access.service";
import { apiError } from "~/server/utils/api-error";
import { resolveLocale } from "~/server/utils/locale";

export default defineEventHandler(async (event) => {
  if (!TeamAccessService.hasReadAccess(event)) {
    throw apiError(event, 401, "errors.team.codeRequired");
  }

  // Body first: the person is checked right before the write, not before a pause in between.
  const body = await readBody(event);
  const member = MemberAccessService.getMember(event);
  PushService.registerDevice(body, member ?? undefined, resolveLocale(event));
  return { success: true };
});
