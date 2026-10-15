import type { XlsxCell } from "~/server/utils/xlsx";
import type { IsoWeek } from "~/server/services/rotation-excel/calendar";
import type { RotationConfig } from "~/types/rotation";

type InstructionInput = {
  config: Pick<RotationConfig, "cycle_length" | "start_year" | "start_week">;
  staffCount: number;
  /** Upcoming calendar weeks per pattern week, index 0 = pattern week 1. */
  calendarWeeks: IsoWeek[][];
  current: { week: IsoWeek; patternWeek: number };
  /** A person and their cell values for pattern week 1, 2, ... ("" = free). */
  example: { name: string; values: string[] };
  shiftNames: string[];
};

function section(title: string): XlsxCell[] {
  return [
    { value: title, style: "header" },
    { value: "", style: "header" },
  ];
}

function item(label: string, text: string): XlsxCell[] {
  return [{ value: label, style: "label" }, text];
}

function exampleText({ config, calendarWeeks, example }: InstructionInput): string {
  const { name, values } = example;
  const shown = (value: string | undefined) => (value ? `„${value}“` : "nichts (frei)");
  const worked = (value: string | undefined) => value || "frei";
  // Pattern week 2 right after the next pattern week 1, so the example reads forward in time.
  const order = (entry: IsoWeek) => entry.year * 100 + entry.week;
  const first = calendarWeeks[0]?.[0];
  const firstWeek = first?.week;
  const secondWeek = calendarWeeks[1]?.find((entry) => first && order(entry) > order(first))?.week;
  const repeatWeek = calendarWeeks[0]?.[1]?.week;

  if (config.cycle_length === 1 || secondWeek === undefined) {
    return `Steht bei ${name} unter Woche 1 ${shown(values[0])}, dann gilt das jede Woche: ${name} hat immer ${worked(values[0])}.`;
  }

  return (
    `Steht bei ${name} unter Woche 1 ${shown(values[0])} und unter Woche 2 ${shown(values[1])}, ` +
    `dann hat ${name} in KW ${firstWeek} ${worked(values[0])} und in KW ${secondWeek} ${worked(values[1])}. ` +
    `Nach Woche ${config.cycle_length} geht es wieder mit Woche 1 los, also ab KW ${repeatWeek} wieder ${worked(values[0])}.`
  );
}

/** What the file was built from, so a missing person or shift is noticed before filling it in. */
function contentsText({ config, staffCount, shiftNames }: InstructionInput): string {
  const staff =
    staffCount === 0
      ? "keine Mitarbeitenden (bitte zuerst in der App anlegen)"
      : `${staffCount} ${staffCount === 1 ? "Person" : "Mitarbeitende"}`;
  const shifts =
    shiftNames.length === 0
      ? "keine Schichten (bitte zuerst in der App anlegen)"
      : `${shiftNames.length} ${shiftNames.length === 1 ? "Schicht" : "Schichten"} (${shiftNames.join(", ")})`;

  return `${staff}, ${shifts}, ${config.cycle_length}-Wochen-Zyklus ab KW ${config.start_week}/${config.start_year}.`;
}

export function createInstructionRows(input: InstructionInput): XlsxCell[][] {
  const { config, current, shiftNames } = input;
  const twoShifts = shiftNames.length >= 2 ? `${shiftNames[0]}, ${shiftNames[1]}` : "Früh, Spät";
  const lastWeek = config.cycle_length;

  return [
    [{ value: "Anleitung: Rotation in Excel ausfüllen", style: "title" }],
    [],
    section("Bevor du loslegst"),
    item(
      "Erst in der App",
      "Alle Mitarbeitenden und Schichten anlegen und Startwoche und Zykluslänge festlegen. Erst danach diese Vorlage herunterladen."
    ),
    item("In dieser Datei", contentsText(input)),
    item(
      "Fehlt etwas?",
      "Nicht in Excel ergänzen, das klappt beim Hochladen nicht. In der App anlegen und die Vorlage neu herunterladen."
    ),
    [],
    section("In 3 Schritten"),
    item(
      "1. Öffnen",
      "Unten auf den Reiter „Rotation“ klicken. Jede Zeile ist eine Person, jede Spalte eine Woche."
    ),
    item(
      "2. Ausfüllen",
      "Klick in eine gelbe Zelle und wähl über den kleinen Pfeil die Schicht. Leer lassen heißt: frei. Zum Löschen Entf drücken."
    ),
    item(
      "3. Hochladen",
      "Datei speichern (als .xlsx) und in der App hochladen. Die App zeigt dir vorher, was übernommen wird."
    ),
    [],
    section("Was heißt „Woche 1“, „Woche 2“ …?"),
    item(
      "Wiederholung",
      lastWeek === 1
        ? "Der Plan hat nur eine Woche. Sie gilt jede Woche gleich."
        : `Der Plan wiederholt sich alle ${lastWeek} Wochen: Woche 1, Woche 2 … Woche ${lastWeek}, dann wieder Woche 1.`
    ),
    item(
      "Kalenderwochen",
      `Im Kopf jeder Spalte steht, für welche Kalenderwochen (KW) sie als Nächstes gilt. Gerade (KW ${current.week.week}/${current.week.year}) läuft Woche ${current.patternWeek}.`
    ),
    item("Beispiel", exampleText(input)),
    [],
    section("Gut zu wissen"),
    item(
      "Zwei Schichten",
      `Arbeitet jemand in einer Woche zwei Schichten, schreib beide mit Komma: „${twoShifts}“. Excel fragt dann nach, einfach mit „Ja“ bestätigen.`
    ),
    item(
      "Nicht ändern",
      "Die Namen in Spalte A, die Spaltenköpfe „Woche …“ und den Blattnamen „Rotation“."
    ),
    item(
      "Beim Hochladen",
      "Die Datei ersetzt das ganze Rotationsmuster in der App. Fertige Wochenpläne ändern sich erst, wenn du das Muster in der App ausrollst."
    ),
  ];
}
