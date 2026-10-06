import { PushService } from "~/server/services/push.service";

export default defineEventHandler(async (event) => {
  const body = await readBody<{ token?: unknown }>(event);
  PushService.removeDevice(body?.token);
  return { success: true };
});
