import instructions from "./excel-instructions";

// The rotation template (server/services/rotation-excel). The import reads the sheet name „rotation“
// and the labels in excel.labels back in every language, so a file stays importable after a switch.
export default {
  fileName: "shiftplan-rotation-template.xlsx",
  sheets: {
    instructions: "Anleitung",
    rotation: "Rotation",
    shifts: "Schichten",
  },
  title: "Rotation: Wer arbeitet in welcher Woche welche Schicht?",
  hint: "Gelbe Zellen ausfüllen: Zelle anklicken und über den kleinen Pfeil die Schicht wählen. Leer lassen = frei. Mehr dazu im Blatt „{sheet}“.",
  startYearHint: "Jahr, in dem Woche 1 zum ersten Mal gilt",
  startWeekHint: "Kalenderwoche, in der Woche 1 zum ersten Mal gilt",
  cycleLengthHint: "Nach so vielen Wochen beginnt der Plan wieder bei Woche 1",
  incomplete: "Noch nicht alles angelegt: erst Mitarbeitende und Schichten in der App anlegen, dann die Vorlage neu herunterladen.",
  // {week} is the calendar week with its year: „KW 42/2026“.
  current: "Gerade ({week}) läuft Woche {patternWeek}.",
  time: "Zeit",
  minStaff: "Mindestbesetzung",
  dropdown: {
    prompt: "Schicht wählen oder leer lassen (= frei).",
    warning: "Diese Schicht steht nicht in der Liste. Zwei Schichten in einer Woche mit Komma schreiben, z. B. „{shifts}“.",
  },
  // Stand-ins for the instructions while no person or shift exists yet.
  example: {
    name: "Anna Beispiel",
    early: "Früh",
    late: "Spät",
  },
  instructions,
};
