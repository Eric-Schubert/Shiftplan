import { parseISODate } from "~/shared/utils/iso-date";
import { formatNoticeDay } from "~/shared/utils/notice-day";
import { toISOWeek } from "~/shared/utils/week";

export const ABSENCE_MESSAGE_MAX_LENGTH = 160;

/**
 * „Anna Weber fällt Do. 08.10. aus – Frühschicht offen“ or
 * „Anna Weber fällt Mo. 12.10. – Fr. 23.10. aus“, never with the reason.
 */
export function buildAbsenceNotice(input: {
  staffName: string;
  from: string;
  to?: string | null;
  shiftName: string | null;
  message?: string | null;
  /** Adds the question who takes over; the app shows the open requests. */
  seekingTakeover?: boolean;
}) {
  const to = input.to && input.to !== input.from ? input.to : null;
  const parsed = parseISODate(input.from)!;
  const { year, week } = toISOWeek(parsed.year, parsed.month, parsed.day);
  const label = to ? `${formatNoticeDay(input.from)} – ${formatNoticeDay(to)}` : formatNoticeDay(input.from);
  const shift = !to && input.shiftName ? ` – ${input.shiftName} offen` : "";
  const extra = input.message?.trim();

  return {
    title: "Ausfall im Team",
    body: `${input.staffName} fällt ${label} aus${shift}${input.seekingTakeover ? " – wer übernimmt?" : ""}${extra ? `\n${extra}` : ""}`,
    url: input.seekingTakeover ? "/?anfragen=1" : `/?year=${year}&week=${week}`,
    year,
    week,
  };
}
