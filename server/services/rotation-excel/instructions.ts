import type { XlsxCellValue } from "~/server/utils/xlsx";
import type { RotationConfig } from "~/types/rotation";
import type { Shift } from "~/types/shift";
import type { Staff } from "~/types/staff";

export function createInstructionRows(
  config: RotationConfig,
  shifts: Shift[],
  staff: Staff[]
): XlsxCellValue[][] {
  const firstShift = shifts[0]?.name || "Frueh";
  const secondShift = shifts[1]?.name || "Spaet";
  const firstStaff = staff[0]?.name || "Anna Beispiel";
  const secondStaff = staff[1]?.name || "Ben Beispiel";

  return [
    ["Schichtplan Rotation - Anleitung"],
    [
      "Kurz gesagt",
      "Du bearbeitest nur das Blatt 'Rotation'. Dort steht, welche Mitarbeiter in welcher Musterwoche welche Schicht machen.",
    ],
    [
      "Wichtig",
      "Beim Import ersetzt diese Datei das komplette Rotationsmuster in der App. Der Wochenplan wird erst angepasst, wenn du in der App Plaene aus dem Muster generierst.",
    ],
    [],
    ["Was ist eine Schichtrotation?"],
    [
      "Rotation",
      "Die Rotation ist ein wiederholendes Muster. Bei einer Zykluslänge von 4 gibt es Musterwoche 1, 2, 3 und 4. Danach beginnt wieder Musterwoche 1.",
    ],
    [
      "Musterwoche",
      "Eine Musterwoche ist keine feste Kalenderwoche. Sie beschreibt nur die Position im wiederholenden Zyklus.",
    ],
    [
      "Startwoche",
      `Die Startwoche legt fest, welche Kalenderwoche als Musterwoche 1 gilt. Aktuell: KW ${config.start_week}/${config.start_year}.`,
    ],
    [
      "Beispiel",
      `Bei Start KW ${config.start_week}/${config.start_year} und Zykluslänge ${config.cycle_length} ist diese KW Musterwoche 1. Die nächste KW ist Musterwoche 2, bis der Zyklus wieder bei 1 beginnt.`,
    ],
    [
      "Generieren",
      "Wenn die App einen Plan aus dem Muster generiert, rechnet sie zuerst aus, welche Musterwoche für die Kalenderwoche gilt, und übernimmt dann die Namen aus dieser Musterwoche.",
    ],
    [],
    [],
    ["So bearbeitest du die Datei"],
    ["1", "Öffne das Blatt 'Rotation'."],
    [
      "2",
      "Passe oben Startjahr, Startwoche und Zykluslänge an, falls der Rotationsstart geändert werden soll.",
    ],
    [
      "3",
      "Trage unten in der Spalte 'Mitarbeiter' die Namen ein. Mehrere Namen werden mit Komma getrennt.",
    ],
    [
      "4",
      `Beispiel für eine Zelle: ${firstStaff}, ${secondStaff}`,
    ],
    [
      "5",
      "Lasse die Mitarbeiter-Zelle leer, wenn die Schicht in dieser Musterwoche frei bleiben soll.",
    ],
    [
      "6",
      "Schichtnamen bitte nicht ändern. Verwende exakt die Namen aus dem Blatt 'Schichten'.",
    ],
    [
      "7",
      "Speichere die Datei als .xlsx und lade sie wieder in der App hoch.",
    ],
    [],
    ["Was darf geändert werden?"],
    ["Ja", "Startjahr, Startwoche, Zykluslänge im Blatt 'Rotation'."],
    ["Ja", "Mitarbeiter-Namen in der Spalte 'Mitarbeiter (Komma getrennt)'."],
    ["Ja", "Weitere Zeilen mit vorhandenen Musterwochen und vorhandenen Schichten, falls du die Tabelle erweiterst."],
    ["Nein", "Blattname 'Rotation' und die Spaltenüberschriften."],
    ["Nein", "Schichtnamen, wenn sie nicht exakt so auch im Blatt 'Schichten' stehen."],
    ["Nein", "Mitarbeiter-Namen, wenn sie nicht exakt so auch im Blatt 'Mitarbeiter' stehen."],
    [],
    ["Beispiele"],
    ["Eine Person", `${firstStaff}`],
    ["Mehrere Personen", `${firstStaff}, ${secondStaff}`],
    ["Keine Person", "Zelle leer lassen"],
    ["Schichtzeile", `Musterwoche 1 | ${firstShift} | ${firstStaff}, ${secondStaff}`],
    ["Nächste Schicht", `Musterwoche 1 | ${secondShift} | ${secondStaff}`],
    [],
    ["Nachschlageblaetter"],
    [
      "Mitarbeiter",
      "Dieses Blatt zeigt alle aktiven Mitarbeiter, die in der Rotation verwendet werden koennen. Es ist nur zum Nachschlagen.",
    ],
    [
      "Schichten",
      "Dieses Blatt zeigt alle aktiven Schichten, die in der Rotation verwendet werden koennen. Es ist nur zum Nachschlagen.",
    ],
    [
      "IDs",
      "Interne IDs werden in dieser Vorlage bewusst nicht angezeigt. Du arbeitest nur mit lesbaren Namen.",
    ],
  ];
}
