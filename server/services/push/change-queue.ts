import { formatNoticeDay } from "~/server/utils/absence-notice";
import { getDatabase } from "~/server/utils/database";
import { TeamAccessService } from "~/server/services/team-access.service";
import { listDevices } from "~/server/services/push/devices";
import { buildChangePayload, buildNativeMessages } from "~/server/services/push/messages";
import { rememberOrigin } from "~/server/services/push/origin";
import { sendNative } from "~/server/services/push/send";
import { sendWebPush } from "~/server/services/push/web";
import { getNotifiableWeeks } from "~/server/services/push/weeks";
import type { PendingChange, SendCounts, ShiftChange } from "~/server/services/push/types";

// Changes are bundled so a planner editing several slots sends one push.
const CHANGE_QUIET_MS = 60 * 1000;
const CHANGE_MAX_DELAY_MS = 5 * 60 * 1000;

const pendingChanges = new Map<string, PendingChange>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let firstPendingAt = 0;

/**
 * Queues a manual plan change for the bundled push. Changes outside the current
 * and next week are regular planning and stay silent.
 */
export function queueShiftChange(change: ShiftChange, origin?: string): void {
  const isNotifiable = getNotifiableWeeks().some(
    (week) => week.year === change.year && week.week === change.week
  );
  if (!isNotifiable) return;

  const db = getDatabase();
  const shift = db
    .prepare("SELECT name, sort_order FROM shifts WHERE shift_id = ?")
    .get(change.shiftId) as { name: string; sort_order: number } | undefined;
  const staff = db
    .prepare("SELECT name FROM staff WHERE staff_id = ?")
    .get(change.staffId) as { name: string } | undefined;
  if (!shift || !staff) return;

  if (origin) rememberOrigin(origin);

  const key = `${change.year}-${change.week}|${change.shiftId}|${change.staffId}|${change.date ?? ""}`;
  const pending = pendingChanges.get(key) || {
    year: change.year,
    week: change.week,
    // A day change reads „Früh Di. 13.10.“ so it groups apart from the whole week.
    shiftName: change.date ? `${shift.name} ${formatNoticeDay(change.date)}` : shift.name,
    shiftOrder: shift.sort_order,
    staffId: change.staffId,
    staffName: staff.name,
    delta: 0,
  };
  pending.delta = Math.max(-1, Math.min(1, pending.delta + (change.action === "assign" ? 1 : -1)));
  pendingChanges.set(key, pending);

  const now = Date.now();
  if (!flushTimer) firstPendingAt = now;
  if (flushTimer) clearTimeout(flushTimer);

  const delay = Math.max(0, Math.min(CHANGE_QUIET_MS, firstPendingAt + CHANGE_MAX_DELAY_MS - now));
  flushTimer = setTimeout(() => {
    void flushPendingChanges();
  }, delay);
}

export async function flushPendingChanges(): Promise<SendCounts | null> {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = null;

  const changes = [...pendingChanges.values()];
  pendingChanges.clear();
  const payload = buildChangePayload(changes);
  if (!payload) return null;

  try {
    const web = await sendWebPush(payload);
    const native = await sendNative(
      buildNativeMessages(changes, listDevices(), TeamAccessService.getInstanceId())
    );
    return { sent: web.sent + native.sent, failed: web.failed + native.failed };
  } catch (error) {
    console.error("[push] Änderungs-Push fehlgeschlagen:", error);
    return null;
  }
}

export function hasPendingChanges(): boolean {
  return pendingChanges.size > 0;
}
