import { localeTag } from "~/i18n/config";
import { t } from "~/i18n/server";
import type { NativeMessage } from "~/server/services/push-relay.service";
import { groupByLocale } from "~/server/services/push/locales";
import { sortChanges, withLabels, type LabeledChange } from "~/server/services/push/messages";
import type { PendingChange, StoredDevice } from "~/server/services/push/types";
import { weekLabel } from "~/shared/utils/format/week";

// The relay takes 30 calls a minute and one text per call, whatever the language. Beyond this many
// different "only mine" texts across all languages, those devices get one text per set of weeks instead.
const MAX_PERSONAL_TEXTS = 8;
// The relay rejects texts over 500 characters, which would cost every device of that text its push.
const MAX_APP_BODY_LENGTH = 480;

type Summarize = (changes: LabeledChange[], locale: string) => string;
type Recipient = { token: string; changes: LabeledChange[] };
/** The devices of one language, each with the changes it hears about. */
type LocaleGroup = { locale: string; team: Recipient[]; personal: Recipient[] };

/** "KW 41: Frühschicht, Spätschicht · KW 42: Nacht" without any staff names. */
function summarizeShifts(changes: LabeledChange[], locale: string): string {
  const weeks = new Map<string, { week: number; shifts: string[] }>();
  for (const change of sortChanges(changes, locale)) {
    const key = `${change.year}-${change.week}`;
    const entry = weeks.get(key) || { week: change.week, shifts: [] };
    if (!entry.shifts.includes(change.label)) entry.shifts.push(change.label);
    weeks.set(key, entry);
  }
  const tag = localeTag(locale);
  return [...weeks.values()]
    .map((entry) => t(locale, "push.change.weekShifts", { week: weekLabel(tag, entry.week), shifts: entry.shifts.join(", ") }))
    .join(" · ");
}

/** "Änderungen in KW 41 · KW 42", for when per-shift texts would be too many. */
function summarizeWeeks(changes: LabeledChange[], locale: string): string {
  const weeks = new Set(sortChanges(changes, locale).map((change) => weekLabel(localeTag(locale), change.week)));
  return t(locale, "push.change.weeks", { weeks: [...weeks].join(" · ") });
}

function fitAppBody(text: string): string {
  return text.length > MAX_APP_BODY_LENGTH ? `${text.slice(0, MAX_APP_BODY_LENGTH - 1)}…` : text;
}

/** One relay message per distinct text, linking to the first week it names. */
function groupByText(title: string, recipients: Recipient[], summarize: Summarize, instanceId: string, locale: string): NativeMessage[] {
  const messages = new Map<string, NativeMessage>();
  for (const { token, changes } of recipients) {
    const body = fitAppBody(summarize(changes, locale));
    const first = sortChanges(changes, locale)[0]!;
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

/** Devices by language; team devices hear every change, "only mine" devices their own shifts. */
function groupDevices(changes: PendingChange[], devices: StoredDevice[]): LocaleGroup[] {
  return [...groupByLocale(devices)].map(([locale, group]) => {
    const labeled = withLabels(changes, locale);
    const team = group.filter((device) => device.scope === "all").map((device) => ({ token: device.token, changes: labeled }));
    const personal = group
      .filter((device) => device.scope === "mine")
      .map((device) => ({ token: device.token, changes: labeled.filter((change) => change.staffId === device.staff_id) }))
      .filter((recipient) => recipient.changes.length > 0);
    return { locale, team, personal };
  });
}

/**
 * App pushes for all devices, each in the language it registered with. They go through Google/Apple
 * without end-to-end encryption, so they only name weeks and shifts.
 */
export function buildNativeMessages(changes: PendingChange[], devices: StoredDevice[], instanceId: string): NativeMessage[] {
  const effective = changes.filter((change) => change.delta !== 0);
  if (effective.length === 0 || devices.length === 0) return [];
  const groups = groupDevices(effective, devices);

  const personal = (summarize: Summarize) =>
    groups.flatMap(({ locale, personal }) => groupByText(t(locale, "push.change.ownTitle"), personal, summarize, instanceId, locale));
  let own = personal(summarizeShifts);
  if (own.length > MAX_PERSONAL_TEXTS) own = personal(summarizeWeeks);
  const team = groups.flatMap(({ locale, team }) => groupByText(t(locale, "push.change.teamTitle"), team, summarizeShifts, instanceId, locale));
  return [...team, ...own];
}
