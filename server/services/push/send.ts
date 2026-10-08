import { PushRelayService, type NativeMessage } from "~/server/services/push-relay.service";
import { TeamAccessService } from "~/server/services/team-access.service";
import { listDevices, removeDevice } from "~/server/services/push/devices";
import { getHttpsOrigin } from "~/server/services/push/origin";
import { sendWebPush } from "~/server/services/push/web";
import type { PushPayload, SendCounts } from "~/server/services/push/types";

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

/** Team message from a planner: browsers and app devices get the same text. */
export async function sendToAll(payload: PushPayload): Promise<SendCounts> {
  const web = await sendWebPush(payload);
  const tokens = listDevices().map((device) => device.token);
  const native = await sendNative([
    {
      title: payload.title,
      body: payload.body,
      data: { instanceId: TeamAccessService.getInstanceId(), url: payload.url },
      tokens,
    },
  ]);
  return { sent: web.sent + native.sent, failed: web.failed + native.failed };
}

/**
 * Message to the whole team about an absence. The absent person's own devices are skipped;
 * the reason is never part of it.
 */
export async function sendTeamNotice(
  payload: PushPayload & { year: number; week: number },
  options: { excludeStaffId?: number } = {}
): Promise<SendCounts> {
  const web = await sendWebPush(payload, { excludeStaffId: options.excludeStaffId });
  const tokens = listDevices()
    .filter((device) => options.excludeStaffId === undefined || device.staff_id !== options.excludeStaffId)
    .map((device) => device.token);
  const native = await sendNative([
    {
      title: payload.title,
      body: payload.body,
      data: {
        instanceId: TeamAccessService.getInstanceId(),
        url: payload.url,
        year: String(payload.year),
        week: String(payload.week),
      },
      tokens,
    },
  ]);
  return { sent: web.sent + native.sent, failed: web.failed + native.failed };
}

/**
 * Message to specific people, e.g. the partner of a swap request: their app devices and
 * browsers signed in as them. Team-wide browsers are not reached.
 */
export async function sendToStaff(staffIds: number[], payload: PushPayload & { kind?: string }): Promise<SendCounts> {
  const wanted = new Set(staffIds);
  const web = await sendWebPush(payload, { staffIds });
  const tokens = listDevices()
    .filter((device) => device.staff_id !== null && wanted.has(device.staff_id))
    .map((device) => device.token);
  if (tokens.length === 0) return web;
  const native = await sendNative([
    {
      title: payload.title,
      body: payload.body,
      data: {
        instanceId: TeamAccessService.getInstanceId(),
        url: payload.url,
        ...(payload.kind ? { kind: payload.kind } : {}),
      },
      tokens,
    },
  ]);
  return { sent: web.sent + native.sent, failed: web.failed + native.failed };
}
