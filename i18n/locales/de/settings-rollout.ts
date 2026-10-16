// Last wizard step: rolling the pattern out into weekly plans, with range, overwrite choice and preview.
export default {
  range: {
    fromWeek: "Ab KW",
    pastStart: "Die Startwoche liegt in der Vergangenheit (heute ist {week}).",
    until: "Bis wann?",
    yearEnd: "Bis Jahresende",
    count: "Eine bestimmte Anzahl Wochen",
  },
  overwrite: {
    planned: "{weeks} sind schon geplant.",
    plannedWeeks: "{planned} von {total} Wochen",
    label: "Geplante Wochen überschreiben",
    on: "Diese Wochen werden komplett neu aus dem Muster befüllt. Manuelle Änderungen darin gehen verloren.",
    off: "Aus: geplante Wochen bleiben, wie sie sind. Nur leere Wochen werden befüllt.",
  },
  dayChanges:
    "Im Zeitraum gibt es 1 Tagesänderung (z. B. Tausch oder Übernahme). Sie bleiben erhalten und gelten weiter zusätzlich zum Wochenplan. | Im Zeitraum gibt es {count} Tagesänderungen (z. B. Tausch oder Übernahme). Sie bleiben erhalten und gelten weiter zusätzlich zum Wochenplan.",
  preview: {
    title: "Vorschau",
    new: "Neu",
    overwritten: "Wird überschrieben",
    kept: "Bleibt wie geplant",
  },
  // The result line reads „3 Wochen erzeugt, davon 1 überschrieben, 2 geplante übersprungen.“
  result: {
    generated: "1 Woche erzeugt | {count} Wochen erzeugt",
    overwritten: ", davon {count} überschrieben",
    skipped: ", {count} geplante übersprungen",
    nothing: "Alle Wochen waren schon geplant, nichts verändert.",
  },
  submit: {
    loading: "Vorschau wird geladen …",
    nothing: "Nichts zu tun",
    weeks: "1 Woche ausrollen | {count} Wochen ausrollen",
    overwriting: "{label} ({count} überschreiben)",
  },
  previewFailed: "Vorschau konnte nicht geladen werden",
  failed: "Ausrollen fehlgeschlagen. Es wurde nichts verändert.",
};
