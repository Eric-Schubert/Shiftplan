import { flushPendingChanges, hasPendingChanges, queueShiftChange } from "~/server/services/push/change-queue";
import { countDevices, registerDevice, removeDevice } from "~/server/services/push/devices";
import { sendNative, sendTeamNotice, sendToAll, sendToStaff } from "~/server/services/push/send";
import { countSubscriptions, subscribe, unsubscribe } from "~/server/services/push/subscriptions";
import { getPublicKey } from "~/server/services/push/vapid";
import { sendWebPush } from "~/server/services/push/web";

export type {
  DevicePlatform,
  DeviceScope,
  PushPayload,
  PushSubscriptionInput,
} from "~/server/services/push/types";
export { buildChangePayload, buildNativeMessages } from "~/server/services/push/messages";
export { getNotifiableWeeks } from "~/server/services/push/weeks";

export const PUSH_MESSAGE_MAX_LENGTH = 240;

export const PushService = {
  getPublicKey,
  subscribe,
  unsubscribe,
  registerDevice,
  removeDevice,
  countDevices,
  countSubscriptions,

  /** Browsers with Web Push plus devices with the app. */
  countRecipients(): number {
    return countSubscriptions() + countDevices();
  },

  sendToAll,
  sendTeamNotice,
  sendToStaff,
  sendNative,
  sendWebPush,
  queueShiftChange,
  flushPendingChanges,
  hasPendingChanges,
};
