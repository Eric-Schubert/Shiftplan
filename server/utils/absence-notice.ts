import { parseISODate, toISOWeek } from "~/server/utils/iso-week";

const WEEKDAYS = ["So.", "Mo.", "Di.", "Mi.", "Do.", "Fr.", "Sa."];
export const ABSENCE_MESSAGE_MAX_LENGTH = 160;

/** „Anna Weber fällt Do. 08.10. aus – Frühschicht offen“, never with the reason. */
export function buildAbsenceNotice(input: {
  staffName: string;
  date: string;
  shiftName: string | null;
  message?: string | null;
}) {
  const parsed = parseISODate(input.date)!;
  const day = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
  const label = `${WEEKDAYS[day.getUTCDay()]} ${String(parsed.day).padStart(2, "0")}.${String(parsed.month).padStart(2, "0")}.`;
  const { year, week } = toISOWeek(parsed.year, parsed.month, parsed.day);
  const shift = input.shiftName ? ` – ${input.shiftName} offen` : "";
  const extra = input.message?.trim();

  return {
    title: "Ausfall im Team",
    body: `${input.staffName} fällt ${label} aus${shift}${extra ? `\n${extra}` : ""}`,
    url: `/?year=${year}&week=${week}`,
    year,
    week,
  };
}
