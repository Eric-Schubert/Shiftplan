import { PushService } from "~/server/services/push.service";
import { TeamAccessService } from "~/server/services/team-access.service";

export default defineEventHandler((event) => {
  const hasAccess = TeamAccessService.hasReadAccess(event);

  return {
    codeRequired: TeamAccessService.isCodeRequired(),
    hasAccess,
    pushPublicKey: hasAccess ? PushService.getPublicKey() : null,
  };
});
