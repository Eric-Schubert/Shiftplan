import { MemberAccessService } from "~/server/services/member-access.service";
import { PushService } from "~/server/services/push.service";
import { TeamAccessService } from "~/server/services/team-access.service";

export default defineEventHandler(async (event) => {
  if (!TeamAccessService.hasReadAccess(event)) {
    throw createError({
      statusCode: 401,
      statusMessage: "Zugangscode erforderlich",
    });
  }

  const member = MemberAccessService.getMember(event);
  PushService.registerDevice(await readBody(event), member ?? undefined);
  return { success: true };
});
