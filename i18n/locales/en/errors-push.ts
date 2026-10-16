import type de from "../de/errors-push";

// Web push subscriptions and app devices.
export default {
  unknownPlatform: "Unknown platform",
  invalidToken: "Invalid device token",
  invalidScope: "Invalid notification scope",
  scopeNeedsStaff: "“Only my shifts” needs a staff member",
  tooManyDevices: "Too many registered devices",
  invalidSubscription: "Invalid push subscription",
  tooManySubscriptions: "Too many push subscriptions",
} satisfies typeof de;
