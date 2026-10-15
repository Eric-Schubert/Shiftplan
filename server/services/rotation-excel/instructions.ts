import type { XlsxCell } from "~/server/utils/xlsx";
import type { IsoWeek } from "~/server/services/rotation-excel/calendar";
import type { RotationConfig } from "~/types/rotation";

type InstructionInput = {
  config: Pick<RotationConfig, "cycle_length">;
  /** Upcoming calendar weeks per pattern week, index 0 = Woche 1. */
  calendarWeeks: IsoWeek[][];
  current: { week: IsoWeek; patternWeek: number };
  /** A person and their cell values for Woche 1, 2, ... ("" = frei). */
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
  // Woche 2 right after the next Woche 1, so the example reads forward in time.
  const order = (entry: IsoWeek) => entry.year * 100 + entry.week;
  const first = calendarWeeks[0]?.[0];
  const firstKw = first?.week;
  const secondKw = calendarWeeks[1]?.find((entry) => first && order(entry) > order(first))?.week;
  const repeatKw = calendarWeeks[0]?.[1]?.week;

  if (config.cycle_length === 1 || secondKw === undefined) {
    return `Steht bei ${name} unter Woche 1 ${shown(values[0])}, dann gilt das jede Woche: ${name} hat immer ${worked(values[0])}.`;
  }

  return (
    `Steht bei ${name} unter Woche 1 ${shown(values[0])} und unter Woche 2 ${shown(values[1])}, ` +
    `dann hat ${name} in KW ${firstKw} ${worked(values[0])} und in KW ${secondKw} ${worked(values[1])}. ` +
    `Nach Woche ${config.cycle_length} geht es wieder mit Woche 1 los, also ab KW ${repeatKw} wieder ${worked(values[0])}.`
  );
}

export function createInstructionRows(input: InstructionInput): XlsxCell[][] {
  const { config, current, shiftNames } = input;
  const twoShifts = shiftNames.length >= 2 ? `${shiftNames[0]}, ${shiftNames[1]}` : "Früh, Spät";
  const lastWeek = config.cycle_length;

  return [
    [{ value: "Anleitung: Rotation in Excel ausfüllen", style: "title" }],
    [],
    section("In 3 Schritten"),
    item(
      "1. Öffnen",
      "Geh ins Blatt „Rotation“. Jede Zeile ist eine Person, jede Spalte eine Woche."
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
      "Neue Person",
      "Neue Mitarbeitende oder Schichten zuerst in der App anlegen und danach die Vorlage neu herunterladen."
    ),
    item(
      "Zyklus ändern",
      "Startwoche oder Zykluslänge änderst du am einfachsten in der App. Danach die Vorlage neu herunterladen, damit Spalten und KW passen."
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
