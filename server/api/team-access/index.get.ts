import { PushService } from "~/server/services/push.service";
import { TeamAccessService } from "~/server/services/team-access.service";
import { requireAdmin } from "~/server/utils/auth";

export default defineEventHandler((event) => {
  requireAdmin(event);

  return {
    code: TeamAccessService.getAccessCode(),
    instanceName: TeamAccessService.getInstanceName(),
    subscriberCount: PushService.countSubscriptions(),
  };
});
