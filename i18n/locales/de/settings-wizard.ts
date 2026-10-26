// Rotation wizard: steps, the current pattern, the Excel import and the review step.
export default {
  header: "Rotations-Assistent",
  steps: {
    pattern: { title: "Muster", text: "Übernehmen oder per Excel importieren" },
    review: { title: "Prüfen", text: "Besetzung je Musterwoche ansehen" },
    rollout: { title: "Ausrollen", text: "Wochenpläne erzeugen" },
  },
  rolloutIntro:
    "Erzeugt die Wochenpläne aus dem Muster. Wochen, die schon geplant sind, bleiben unangetastet, außer du wählst ausdrücklich „überschreiben“.",
  current: {
    title: "Aktuelles Muster",
    firstWeek: "Musterwoche 1 = {week}",
    thisWeek: "Diese Woche ({week}) ist Musterwoche {pattern}.",
    changeStart: "Startpunkt ändern",
  },
  excel: {
    title: "Muster per Excel übernehmen",
    optional: "(optional)",
    intro: "Nur nötig, wenn du das Muster lieber in Excel pflegst. Sonst einfach auf {next}.",
    howTo: {
      prepare:
        "1. Vorher alles anlegen: Mitarbeitende und Schichten in den Einstellungen, Startwoche und Zykluslänge hier oben. Die Vorlage enthält nur, was beim Herunterladen schon da ist.",
      download: "2. Vorlage herunterladen, sie enthält das aktuelle Muster.",
      fill: "3. In Excel bei jeder Person pro Woche die Schicht auswählen und speichern.",
      upload: "4. Hochladen. Du siehst vor dem Ersetzen, was übernommen wird.",
    },
    download: "Vorlage herunterladen",
    upload: "Ausgefüllte Datei hochladen",
    fileOk: "„{file}“ ist in Ordnung.",
    replaceText:
      "Neues Muster: {cycle}, Musterwoche 1 = {week}, {assignments}. Es ersetzt das aktuelle Muster ({current}). Wochenpläne bleiben unverändert, bis du sie im letzten Schritt ausrollst.",
    replace: "Muster ersetzen",
    replaceAndNext: "Muster ersetzen und weiter",
    downloadFailed: "Vorlage konnte nicht geladen werden",
    readFailed: "Die Datei konnte nicht gelesen werden",
    importFailed: "Import fehlgeschlagen, das Muster ist unverändert",
  },
  review: {
    imported: "Muster übernommen: {assignments}.",
    understaffed: "{count} Schicht ist im Muster unter der Mindestbesetzung. | {count} Schichten sind im Muster unter der Mindestbesetzung.",
    allStaffed: "Alle Schichten sind im Muster besetzt.",
    editBoard: "Im Board bearbeiten",
    thisWeek: "diese Woche",
    unstaffed: "unbesetzt",
    staffedOf: "{count} von {min}",
  },
};
