import { PushRelayService, type NativeMessage } from "~/server/services/push-relay.service";
import { TeamAccessService } from "~/server/services/team-access.service";
import { listDevices, removeDevice } from "~/server/services/push/devices";
import { groupByLocale, render, type Localized } from "~/server/services/push/locales";
import { getHttpsOrigin } from "~/server/services/push/origin";
import { sendWebPush } from "~/server/services/push/web";
import type { PushPayload, SendCounts, StoredDevice } from "~/server/services/push/types";

function relayInstance() {
  return {
    name: TeamAccessService.getInstanceName(),
    url: getHttpsOrigin(),
  };
}

export async function sendNative(messages: NativeMessage[]): Promise<SendCounts> {
  const result = await PushRelayService.send(messages, relayInstance());
  for (const token of result.invalidTokens) removeDevice(token);
  return { sent: result.sent, failed: result.failed };
}

/** One relay message per language of the devices; with one language that is the single call as before. */
function perLocale<P extends PushPayload>(devices: StoredDevice[], payload: Localized<P>, data: (payload: P) => Record<string, string>): NativeMessage[] {
  return [...groupByLocale(devices)].map(([locale, group]) => {
    const text = render(payload, locale);
    return { title: text.title, body: text.body, data: data(text), tokens: group.map((device) => device.token) };
  });
}

/** Team message from a planner: browsers and app devices get the same text. */
export async function sendToAll(payload: Localized<PushPayload>): Promise<SendCounts> {
  const web = await sendWebPush(payload);
  const native = await sendNative(perLocale(listDevices(), payload, ({ url }) => ({ instanceId: TeamAccessService.getInstanceId(), url })));
  return { sent: web.sent + native.sent, failed: web.failed + native.failed };
}

/**
 * Message to the whole team about an absence. The absent person's own devices are skipped;
 * the reason is never part of it.
 */
export async function sendTeamNotice(
  payload: Localized<PushPayload & { year: number; week: number }>,
  options: { excludeStaffId?: number } = {}
): Promise<SendCounts> {
  const web = await sendWebPush(payload, { excludeStaffId: options.excludeStaffId });
  const devices = listDevices().filter((device) => options.excludeStaffId === undefined || device.staff_id !== options.excludeStaffId);
  const native = await sendNative(
    perLocale(devices, payload, ({ url, year, week }) => ({
      instanceId: TeamAccessService.getInstanceId(),
      url,
      year: String(year),
      week: String(week),
    }))
  );
  return { sent: web.sent + native.sent, failed: web.failed + native.failed };
}

/**
 * Message to specific people, e.g. the partner of a swap request: their app devices and
 * browsers signed in as them. Team devices are not reached, not even when someone picked
 * that person in team mode, because anyone with the team code can pick anyone.
 */
export async function sendToStaff(staffIds: number[], payload: Localized<PushPayload & { kind?: string }>): Promise<SendCounts> {
  const wanted = new Set(staffIds);
  const web = await sendWebPush(payload, { staffIds });
  const devices = listDevices().filter((device) => device.personal === 1 && device.staff_id !== null && wanted.has(device.staff_id));
  if (devices.length === 0) return web;
  const native = await sendNative(
    perLocale(devices, payload, ({ url, kind }) => ({
      instanceId: TeamAccessService.getInstanceId(),
      url,
      ...(kind ? { kind } : {}),
    }))
  );
  return { sent: web.sent + native.sent, failed: web.failed + native.failed };
}
