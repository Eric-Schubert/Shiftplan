// Settings tab „Rotationsmuster“: toolbar, the pattern board with staff pool and week cards, the start point.
export default {
  // Shared by the board, the wizard, the rollout and the year copy.
  patternWeek: "Musterwoche {week}",
  cycle: "{weeks}-Wochen-Zyklus",
  assignments: "1 Zuweisung | {count} Zuweisungen",
  toolbar: {
    start: "· Start: {week}",
    startWizard: "Assistent starten",
    resumeWizard: "Assistent fortsetzen",
    resumeHint: "Passe das Muster unten an. Wenn alles stimmt, geht es mit {resume} beim Prüfen weiter.",
    hint: "Der Assistent führt dich durch Muster, Prüfung und Ausrollen der Wochenpläne.",
  },
  intro: {
    title: "So funktioniert das Rotationsmuster:",
    text: "Lege fest, wer in welcher Woche des Zyklus welche Schicht arbeitet. Das Muster wiederholt sich alle {weeks}.",
    weeks: "{count} Wochen",
    firstWeek: "Musterwoche 1 beginnt in {week}",
  },
  pool: "Mitarbeiter-Pool – per Drag & Drop in Schichten ziehen",
  week: {
    remove: "{name} aus Musterwoche {week} und Schicht {shift} entfernen",
    dropHere: "Hier ablegen",
    add: "Mitarbeiter zu {shift} in Musterwoche {week} hinzufügen",
    addTitle: "Mitarbeiter hinzufuegen",
    missing: "{count} fehlt",
  },
  assign: {
    header: "Mitarbeiter zuweisen",
    headerFor: "Mitarbeiter zu '{shift}' (Woche {week}) hinzufügen",
    allAssigned: "Alle aktiven Mitarbeiter sind bereits zugewiesen.",
  },
  config: {
    weeksSuffix: " Wochen",
    startWeek: "Musterwoche 1 ist KW",
    inYear: "im Jahr",
    preview: "{week} → Muster {pattern}",
    save: "Startpunkt speichern",
    failed: "Startpunkt konnte nicht gespeichert werden",
    shrink: {
      header: "Zyklus verkürzen?",
      cycleWeeks: "1 Woche | {count} Wochen",
      text: "Der Zyklus wird von {from} auf {to} verkürzt. Musterwoche {first} und ihre {assignments} werden dabei endgültig gelöscht. | Der Zyklus wird von {from} auf {to} verkürzt. Die Musterwochen {first} bis {last} und ihre {assignments} werden dabei endgültig gelöscht.",
      confirm: "Zyklus verkürzen",
    },
  },
};
