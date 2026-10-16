import { localeTag } from "~/i18n/config";
import { t } from "~/i18n/server";
import { parseISODate } from "~/shared/utils/iso-date";
import { formatDayRange } from "~/shared/utils/format/day";
import { toISOWeek } from "~/shared/utils/week";

export const ABSENCE_MESSAGE_MAX_LENGTH = 160;

/**
 * „Anna Weber fällt Do. 08.10. aus – Frühschicht offen“ or
 * „Anna Weber fällt Mo. 12.10. – Fr. 23.10. aus“ in `locale`, never with the reason.
 */
export function buildAbsenceNotice(input: {
  locale: string;
  staffName: string;
  from: string;
  to?: string | null;
  shiftName: string | null;
  message?: string | null;
  /** Adds the question who takes over; the app shows the open requests. */
  seekingTakeover?: boolean;
}) {
  const { locale } = input;
  const to = input.to && input.to !== input.from ? input.to : null;
  const parsed = parseISODate(input.from)!;
  const { year, week } = toISOWeek(parsed.year, parsed.month, parsed.day);
  const params = {
    name: input.staffName,
    days: formatDayRange(localeTag(locale), input.from, to ?? input.from),
    shift: input.shiftName ?? "",
  };
  const notice = t(locale, !to && input.shiftName ? "push.absence.shiftOpen" : "push.absence.days", params);
  const body = input.seekingTakeover ? t(locale, "push.absence.seekingTakeover", { notice }) : notice;
  const extra = input.message?.trim();

  return {
    title: t(locale, "push.absence.title"),
    body: extra ? `${body}\n${extra}` : body,
    url: input.seekingTakeover ? "/?anfragen=1" : `/?year=${year}&week=${week}`,
    year,
    week,
  };
}
