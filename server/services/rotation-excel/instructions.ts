import { localeTag, type AppLocale } from "~/i18n/config";
import { t, type MessageParams } from "~/i18n/server";
import type { MessageKey, Messages } from "~/i18n/types";
import type { XlsxCell } from "~/server/utils/xlsx";
import { weekLabel, weekOfYearLabel } from "~/shared/utils/format/week";
import type { ISOWeek } from "~/shared/utils/week";
import type { RotationConfig } from "~/types/rotation";
import { currentWeekText } from "~/server/services/rotation-excel/calendar";

type InstructionInput = {
  locale: AppLocale;
  /** Name of the sheet to fill in, which the steps point to. */
  rotationSheet: string;
  config: Pick<RotationConfig, "cycle_length" | "start_year" | "start_week">;
  staffCount: number;
  /** Upcoming calendar weeks per pattern week, index 0 = pattern week 1. */
  calendarWeeks: ISOWeek[][];
  current: { week: ISOWeek; patternWeek: number };
  /** A person and their cell values for pattern week 1, 2, ... ("" = free). */
  example: { name: string; values: string[] };
  shiftNames: string[];
};

type Catalog = Messages["excelTemplate"]["instructions"];
// Items with a label and a text in the catalog; the contents and the example text are built here.
type Item = Exclude<keyof Catalog, "title" | "sections" | "contents" | "example">;
type Section = keyof Catalog["sections"];

function exampleText({ locale, config, calendarWeeks, example }: InstructionInput): string {
  const { name, values } = example;
  const tag = localeTag(locale);
  const shown = (value: string | undefined) =>
    value
      ? t(locale, "excelTemplate.instructions.example.quoted", { shift: value })
      : t(locale, "excelTemplate.instructions.example.nothing");
  const worked = (value: string | undefined) => value || t(locale, "excel.labels.free");
  // Pattern week 2 right after the next pattern week 1, so the example reads forward in time.
  const order = (entry: ISOWeek) => entry.year * 100 + entry.week;
  const first = calendarWeeks[0]?.[0];
  const second = calendarWeeks[1]?.find((entry) => first && order(entry) > order(first));
  const repeat = calendarWeeks[0]?.[1];

  if (config.cycle_length === 1 || !first || !second || !repeat) {
    const firstShift = worked(values[0]);
    return t(locale, "excelTemplate.instructions.example.oneWeek", { name, first: shown(values[0]), firstShift });
  }

  return t(locale, "excelTemplate.instructions.example.weeks", {
    name,
    first: shown(values[0]),
    second: shown(values[1]),
    firstWeek: weekLabel(tag, first.week),
    firstShift: worked(values[0]),
    secondWeek: weekLabel(tag, second.week),
    secondShift: worked(values[1]),
    cycle: config.cycle_length,
    repeatWeek: weekLabel(tag, repeat.week),
  });
}

/** What the file was built from, so a missing person or shift is noticed before filling it in. */
function contentsText({ locale, config, staffCount, shiftNames }: InstructionInput): string {
  const staff =
    staffCount === 0
      ? t(locale, "excelTemplate.instructions.contents.noStaff")
      : t(locale, "excelTemplate.instructions.contents.staff", { count: staffCount });
  const shifts =
    shiftNames.length === 0
      ? t(locale, "excelTemplate.instructions.contents.noShifts")
      : t(locale, "excelTemplate.instructions.contents.shifts", { count: shiftNames.length, names: shiftNames.join(", ") });
  const startWeek = weekOfYearLabel(localeTag(locale), config.start_year, config.start_week);

  return t(locale, "excelTemplate.instructions.contents.text", { staff, shifts, cycle: config.cycle_length, startWeek });
}

export function createInstructionRows(input: InstructionInput): XlsxCell[][] {
  const { locale, rotationSheet, config, current, shiftNames } = input;
  const text = (key: MessageKey, params?: MessageParams) => t(locale, key, params);
  const section = (name: Section): XlsxCell[] => [
    { value: text(`excelTemplate.instructions.sections.${name}`), style: "header" },
    { value: "", style: "header" },
  ];
  const labeled = (name: Item | "contents" | "example", value: string): XlsxCell[] => [
    { value: text(`excelTemplate.instructions.${name}.label`), style: "label" },
    value,
  ];
  const item = (name: Item, params?: MessageParams) => labeled(name, text(`excelTemplate.instructions.${name}.text`, params));
  const twoShifts =
    shiftNames.length >= 2
      ? shiftNames.slice(0, 2)
      : [text("excelTemplate.example.early"), text("excelTemplate.example.late")];

  return [
    [{ value: text("excelTemplate.instructions.title"), style: "title" }],
    [],
    section("before"),
    item("app"),
    labeled("contents", contentsText(input)),
    item("missing"),
    [],
    section("steps"),
    item("open", { sheet: rotationSheet }),
    item("fill"),
    item("upload"),
    [],
    section("weeks"),
    item("repeat", { count: config.cycle_length }),
    item("calendarWeeks", { current: currentWeekText(locale, current) }),
    labeled("example", exampleText(input)),
    [],
    section("tips"),
    item("twoShifts", { shifts: twoShifts.join(", ") }),
    item("keep", { sheet: rotationSheet }),
    item("replaces"),
  ];
}
