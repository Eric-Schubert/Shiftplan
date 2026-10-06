import { PushService } from "~/server/services/push.service";

export default defineEventHandler(async (event) => {
  const body = await readBody<{ endpoint?: unknown }>(event);
  PushService.unsubscribe(body?.endpoint);
  return { success: true };
});
