import { PushService } from "~/server/services/push.service";
import { TeamAccessService } from "~/server/services/team-access.service";
import { requireAdmin } from "~/server/utils/auth";
import { resolveLocale } from "~/server/utils/locale";

export default defineEventHandler((event) => {
  requireAdmin(event);

  return {
    code: TeamAccessService.getAccessCode(),
    instanceName: TeamAccessService.getInstanceName(resolveLocale(event)),
    nextWeekFromSaturday: TeamAccessService.getNextWeekFromSaturday(),
    subscriberCount: PushService.countRecipients(),
    instanceLocale: TeamAccessService.getInstanceLocale(),
  };
});
