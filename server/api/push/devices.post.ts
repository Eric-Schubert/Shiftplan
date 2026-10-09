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

  // Body first: the person is checked right before the write, not before a pause in between.
  const body = await readBody(event);
  const member = MemberAccessService.getMember(event);
  PushService.registerDevice(body, member ?? undefined);
  return { success: true };
});
