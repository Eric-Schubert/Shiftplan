import { PushService } from "~/server/services/push.service";
import { TeamAccessService } from "~/server/services/team-access.service";

export default defineEventHandler(async (event) => {
  if (!TeamAccessService.hasReadAccess(event)) {
    throw createError({
      statusCode: 401,
      statusMessage: "Zugangscode erforderlich",
    });
  }

  PushService.subscribe(await readBody(event));
  return { success: true };
});
