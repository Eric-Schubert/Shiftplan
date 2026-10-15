import type { NativeMessage } from "~/server/services/push-relay.service";
import type { PendingChange, PushPayload, StoredDevice } from "~/server/services/push/types";

const MAX_CHANGE_LINES = 4;
const TEAM_TITLE = "Schichtplan geändert";
const OWN_TITLE = "Deine Schicht hat sich geändert";
// The relay takes 30 calls a minute and one text per call. Beyond this many different
// "only mine" texts, those devices get one text per set of weeks instead.
const MAX_PERSONAL_TEXTS = 8;
// The relay rejects texts over 500 characters, which would cost every device of that text its push.
const MAX_APP_BODY_LENGTH = 480;

// Whole-week changes first, then day changes by date, each in shift order.
function sortChanges(changes: PendingChange[]): PendingChange[] {
  return [...changes].sort(
    (a, b) =>
      a.year - b.year ||
      a.week - b.week ||
      (a.date ?? "").localeCompare(b.date ?? "") ||
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
    title: TEAM_TITLE,
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

/** "Änderungen in KW 41 · KW 42", for when per-shift texts would be too many. */
function summarizeWeeks(changes: PendingChange[]): string {
  const weeks = new Set(sortChanges(changes).map((change) => `KW ${change.week}`));
  return `Änderungen in ${[...weeks].join(" · ")}`;
}

type Recipient = { token: string; changes: PendingChange[] };

function fitAppBody(text: string): string {
  return text.length > MAX_APP_BODY_LENGTH ? `${text.slice(0, MAX_APP_BODY_LENGTH - 1)}…` : text;
}

/** One relay message per distinct text, linking to the first week it names. */
function groupByText(
  title: string,
  recipients: Recipient[],
  summarize: (changes: PendingChange[]) => string,
  instanceId: string
): NativeMessage[] {
  const messages = new Map<string, NativeMessage>();
  for (const { token, changes } of recipients) {
    const body = fitAppBody(summarize(changes));
    const first = sortChanges(changes)[0]!;
    const message: NativeMessage = messages.get(body) || {
      title,
      body,
      data: { instanceId, url: `/?year=${first.year}&week=${first.week}`, year: String(first.year), week: String(first.week) },
      tokens: [],
    };
    message.tokens.push(token);
    messages.set(body, message);
  }
  return [...messages.values()];
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

  const team = devices
    .filter((device) => device.scope === "all")
    .map((device) => ({ token: device.token, changes: effective }));
  const personal = devices
    .filter((device) => device.scope === "mine")
    .map((device) => ({ token: device.token, changes: effective.filter((change) => change.staffId === device.staff_id) }))
    .filter((recipient) => recipient.changes.length > 0);

  let own = groupByText(OWN_TITLE, personal, summarizeShifts, instanceId);
  if (own.length > MAX_PERSONAL_TEXTS) own = groupByText(OWN_TITLE, personal, summarizeWeeks, instanceId);
  return [...groupByText(TEAM_TITLE, team, summarizeShifts, instanceId), ...own];
}
