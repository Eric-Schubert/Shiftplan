import { HOUSEKEEPING_INTERVAL_MS, runHousekeeping } from "~/server/services/housekeeping.service";

// Nitro loads plugins in file name order, so database.ts has opened and migrated both databases before
// the first purge runs. After the start the purges repeat hourly; the timer never keeps the process alive.
export default defineNitroPlugin((nitroApp) => {
  runHousekeeping();
  const timer = setInterval(() => runHousekeeping(), HOUSEKEEPING_INTERVAL_MS);
  timer.unref();
  nitroApp.hooks.hook("close", () => clearInterval(timer));
});
