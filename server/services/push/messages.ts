import type { NativeMessage } from "~/server/services/push-relay.service";
import type { PendingChange, PushPayload, StoredDevice } from "~/server/services/push/types";

const MAX_CHANGE_LINES = 4;

function sortChanges(changes: PendingChange[]): PendingChange[] {
  return [...changes].sort(
    (a, b) =>
      a.year - b.year ||
      a.week - b.week ||
      a.shiftOrder - b.shiftOrder ||
      a.shiftName.localeCompare(b.shiftName, "de")
  );
}

export function buildChangePayload(changes: PendingChange[]): PushPayload | null {
  const effective = sortChanges(changes.filter((change) => change.delta !== 0));
  if (effective.length === 0) return null;

  const groups = new Map<string, { label: string; added: string[]; removed: string[] }>();
  for (const change of effective) {
    const key = `${change.year}-${change.week}|${change.shiftName}`;
    const group = groups.get(key) || {
      label: `KW ${change.week} · ${change.shiftName}`,
      added: [],
      removed: [],
    };
    (change.delta > 0 ? group.added : group.removed).push(change.staffName);
    groups.set(key, group);
  }

  const lines = [...groups.values()].map((group) => {
    const parts: string[] = [];
    if (group.added.length > 0) parts.push(`neu: ${group.added.join(", ")}`);
    if (group.removed.length > 0) parts.push(`entfällt: ${group.removed.join(", ")}`);
    return `${group.label}: ${parts.join(" / ")}`;
  });

  const visible = lines.slice(0, MAX_CHANGE_LINES);
  if (lines.length > MAX_CHANGE_LINES) {
    visible.push(`… und ${lines.length - MAX_CHANGE_LINES} weitere Änderungen`);
  }

  const first = effective[0]!;
  return {
    title: "Schichtplan geändert",
    body: visible.join("\n"),
    url: `/?year=${first.year}&week=${first.week}`,
  };
}

/** "KW 41: Frühschicht, Spätschicht · KW 42: Nacht" without any staff names. */
function summarizeShifts(changes: PendingChange[]): string {
  const weeks = new Map<string, { week: number; shifts: string[] }>();
  for (const change of sortChanges(changes)) {
    const key = `${change.year}-${change.week}`;
    const entry = weeks.get(key) || { week: change.week, shifts: [] };
    if (!entry.shifts.includes(change.shiftName)) entry.shifts.push(change.shiftName);
    weeks.set(key, entry);
  }
  return [...weeks.values()].map((entry) => `KW ${entry.week}: ${entry.shifts.join(", ")}`).join(" · ");
}

/**
 * App pushes go through Google/Apple without end-to-end encryption, so they only
 * name weeks and shifts. Devices with "only mine" hear about their own shifts.
 */
export function buildNativeMessages(
  changes: PendingChange[],
  devices: StoredDevice[],
  instanceId: string
): NativeMessage[] {
  const effective = changes.filter((change) => change.delta !== 0);
  if (effective.length === 0 || devices.length === 0) return [];

  const dataFor = (relevant: PendingChange[]) => {
    const first = sortChanges(relevant)[0]!;
    return {
      instanceId,
      url: `/?year=${first.year}&week=${first.week}`,
      year: String(first.year),
      week: String(first.week),
    };
  };

  const messages = new Map<string, NativeMessage>();
  const add = (title: string, relevant: PendingChange[], token: string) => {
    const body = summarizeShifts(relevant);
    const key = `${title}|${body}`;
    const message: NativeMessage = messages.get(key) || {
      title,
      body,
      data: dataFor(relevant),
      tokens: [],
    };
    message.tokens.push(token);
    messages.set(key, message);
  };

  for (const device of devices) {
    if (device.scope === "all") {
      add("Schichtplan geändert", effective, device.token);
      continue;
    }
    const own = effective.filter((change) => change.staffId === device.staff_id);
    if (own.length > 0) add("Deine Schicht hat sich geändert", own, device.token);
  }

  return [...messages.values()];
}
