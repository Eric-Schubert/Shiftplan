// The instruction sheet of the rotation template. {sheet} is a sheet name, {week} a calendar week („KW 43“).
export default {
  title: "Anleitung: Rotation in Excel ausfüllen",
  sections: {
    before: "Bevor du loslegst",
    steps: "In 3 Schritten",
    weeks: "Was heißt „Woche 1“, „Woche 2“ …?",
    tips: "Gut zu wissen",
  },
  app: {
    label: "Erst in der App",
    text: "Alle Mitarbeitenden und Schichten anlegen und Startwoche und Zykluslänge festlegen. Erst danach diese Vorlage herunterladen.",
  },
  // What the file was built from: „2 Mitarbeitende, 2 Schichten (Früh, Spät), 2-Wochen-Zyklus ab KW 1/2026.“
  contents: {
    label: "In dieser Datei",
    text: "{staff}, {shifts}, {cycle}-Wochen-Zyklus ab {startWeek}.",
    noStaff: "keine Mitarbeitenden (bitte zuerst in der App anlegen)",
    staff: "{count} Person | {count} Mitarbeitende",
    noShifts: "keine Schichten (bitte zuerst in der App anlegen)",
    shifts: "{count} Schicht ({names}) | {count} Schichten ({names})",
  },
  missing: {
    label: "Fehlt etwas?",
    text: "Nicht in Excel ergänzen, das klappt beim Hochladen nicht. In der App anlegen und die Vorlage neu herunterladen.",
  },
  open: {
    label: "1. Öffnen",
    text: "Unten auf den Reiter „{sheet}“ klicken. Jede Zeile ist eine Person, jede Spalte eine Woche.",
  },
  fill: {
    label: "2. Ausfüllen",
    text: "Klick in eine gelbe Zelle und wähl über den kleinen Pfeil die Schicht. Leer lassen heißt: frei. Zum Löschen Entf drücken.",
  },
  upload: {
    label: "3. Hochladen",
    text: "Datei speichern (als .xlsx) und in der App hochladen. Die App zeigt dir vorher, was übernommen wird.",
  },
  // {count} is the cycle length.
  repeat: {
    label: "Wiederholung",
    text: "Der Plan hat nur eine Woche. Sie gilt jede Woche gleich. | Der Plan wiederholt sich alle {count} Wochen: Woche 1, Woche 2 … Woche {count}, dann wieder Woche 1.",
  },
  // {current} is excelTemplate.current.
  calendarWeeks: {
    label: "Kalenderwochen",
    text: "Im Kopf jeder Spalte steht, für welche Kalenderwochen (KW) sie als Nächstes gilt. {current}",
  },
  // {first} and {second} are the cells of week 1 and 2 (quoted or nothing), {firstShift} and
  // {secondShift} what that means (the shift or excel.labels.free).
  example: {
    label: "Beispiel",
    oneWeek: "Steht bei {name} unter Woche 1 {first}, dann gilt das jede Woche: {name} hat immer {firstShift}.",
    weeks:
      "Steht bei {name} unter Woche 1 {first} und unter Woche 2 {second}, dann hat {name} in {firstWeek} {firstShift} und in {secondWeek} {secondShift}. Nach Woche {cycle} geht es wieder mit Woche 1 los, also ab {repeatWeek} wieder {firstShift}.",
    quoted: "„{shift}“",
    nothing: "nichts (frei)",
  },
  twoShifts: {
    label: "Zwei Schichten",
    text: "Arbeitet jemand in einer Woche zwei Schichten, schreib beide mit Komma: „{shifts}“. Excel fragt dann nach, einfach mit „Ja“ bestätigen.",
  },
  keep: {
    label: "Nicht ändern",
    text: "Die Namen in Spalte A, die Spaltenköpfe „Woche …“ und den Blattnamen „{sheet}“.",
  },
  replaces: {
    label: "Beim Hochladen",
    text: "Die Datei ersetzt das ganze Rotationsmuster in der App. Fertige Wochenpläne ändern sich erst, wenn du das Muster in der App ausrollst.",
  },
};
