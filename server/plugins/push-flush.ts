import { PushService } from "~/server/services/push.service";

// Bundled plan-change pushes wait in memory for up to five minutes; send them before the server stops.
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("close", async () => {
    if (PushService.hasPendingChanges()) await PushService.flushPendingChanges();
  });
});
