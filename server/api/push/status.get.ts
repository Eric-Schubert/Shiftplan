import { PushService } from "~/server/services/push.service";
import { requirePlanner } from "~/server/utils/auth";

export default defineEventHandler((event) => {
  requirePlanner(event);
  return { subscriberCount: PushService.countRecipients() };
});
