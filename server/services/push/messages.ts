import { localeTag } from "~/i18n/config";
import { t } from "~/i18n/server";
import type { PendingChange, PushPayload } from "~/server/services/push/types";
import { formatDay } from "~/shared/utils/format/day";
import { collator } from "~/shared/utils/format/number";
import { weekLabel } from "~/shared/utils/format/week";

const MAX_CHANGE_LINES = 4;

/** A change with the shift as the push names it, a day change with its date: „Früh Di. 13.10.“. */
export type LabeledChange = PendingChange & { label: string };

export function withLabels(changes: PendingChange[], locale: string): LabeledChange[] {
  const tag = localeTag(locale);
  return changes.map((change) => ({
    ...change,
    label: change.date ? t(locale, "push.change.dayShift", { shift: change.shiftName, day: formatDay(tag, change.date) }) : change.shiftName,
  }));
}

// Whole-week changes first, then day changes by date, each in shift order.
export function sortChanges(changes: LabeledChange[], locale: string): LabeledChange[] {
  return [...changes].sort(
    (a, b) =>
      a.year - b.year ||
      a.week - b.week ||
      (a.date ?? "").localeCompare(b.date ?? "") ||
      a.shiftOrder - b.shiftOrder ||
      collator(localeTag(locale)).compare(a.label, b.label)
  );
}

/** The browser push about plan changes in `locale`; null when the changes cancel out. */
export function buildChangePayload(changes: PendingChange[], locale: string): PushPayload | null {
  const effective = sortChanges(
    withLabels(
      changes.filter((change) => change.delta !== 0),
      locale
    ),
    locale
  );
  if (effective.length === 0) return null;

  const groups = new Map<string, { label: string; added: string[]; removed: string[] }>();
  for (const change of effective) {
    const key = `${change.year}-${change.week}|${change.label}`;
    const group = groups.get(key) || {
      label: t(locale, "push.change.group", { week: weekLabel(localeTag(locale), change.week), shift: change.label }),
      added: [],
      removed: [],
    };
    (change.delta > 0 ? group.added : group.removed).push(change.staffName);
    groups.set(key, group);
  }

  const lines = [...groups.values()].map((group) => {
    const parts: string[] = [];
    if (group.added.length > 0) parts.push(t(locale, "push.change.added", { names: group.added.join(", ") }));
    if (group.removed.length > 0) parts.push(t(locale, "push.change.removed", { names: group.removed.join(", ") }));
    return t(locale, "push.change.line", { group: group.label, changes: parts.join(" / ") });
  });

  const visible = lines.slice(0, MAX_CHANGE_LINES);
  if (lines.length > MAX_CHANGE_LINES) {
    visible.push(t(locale, "push.change.more", { count: lines.length - MAX_CHANGE_LINES }));
  }

  const first = effective[0]!;
  return {
    title: t(locale, "push.change.teamTitle"),
    body: visible.join("\n"),
    url: `/?year=${first.year}&week=${first.week}`,
  };
}
