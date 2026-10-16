// Audit log in the settings. Entries store their reason as a key below `reason` with plain values
// and are rendered when shown (i18n/audit-reason.ts): {day} „Do. 08.10.“ comes from `date`,
// {days} „Mi. 07.10. – Fr. 09.10.“ from `from` and `to`, {weekOfYear} „KW 42/2026“ from `year` and `week`.
export default {
  reason: {
    // Day changes: a single day on top of the weekly plan, or the days a request moved.
    day: "nur {day}",
    takeover: "Übernahme für {name}, {day}",
    swap: "Tausch {requester} ↔ {partner}, {day}",
    requestReverted: "Anfrage zurückgenommen, {day}",
    // Absences name only their days, never the reason.
    absence: "{days}",
    // A rollout either overwrites planned weeks or skips them, never both.
    generated: "1 Woche bis {weekOfYear} aus dem Rotationsmuster erzeugt | {count} Wochen bis {weekOfYear} aus dem Rotationsmuster erzeugt",
    generatedOverwritten:
      "1 Woche bis {weekOfYear} aus dem Rotationsmuster erzeugt, {overwritten} davon überschrieben | {count} Wochen bis {weekOfYear} aus dem Rotationsmuster erzeugt, {overwritten} davon überschrieben",
    generatedSkipped:
      "1 Woche bis {weekOfYear} aus dem Rotationsmuster erzeugt, {skipped} bereits geplante übersprungen | {count} Wochen bis {weekOfYear} aus dem Rotationsmuster erzeugt, {skipped} bereits geplante übersprungen",
    patternImported:
      "Rotationsmuster aus Excel ersetzt: {cycle}-Wochen-Zyklus, {count} Zuweisung | Rotationsmuster aus Excel ersetzt: {cycle}-Wochen-Zyklus, {count} Zuweisungen",
  },
  action: {
    assign: "Zugewiesen",
    unassign: "Entfernt",
    dayAdd: "Für einen Tag eingeteilt",
    dayRemove: "Für einen Tag ausgetragen",
    absence: "Ausfall gemeldet",
    absenceCancel: "Ausfall zurückgezogen",
    generate: "Aus Muster ausgerollt",
    patternImport: "Muster importiert",
  },
  // Between the person and the shift: „Anna Weber → Früh“, „Anna Weber fällt aus · Früh“.
  separator: {
    added: " → ",
    removed: " ✕ ",
    absent: " fällt aus · ",
    back: " wieder da · ",
  },
  // A person or shift deleted before the entry was written.
  unknown: "Unbekannt",
  fromWeek: "ab {week}",
  viaApp: "über App",
  intro: "Alle manuellen Änderungen am Schichtplan",
  empty: "Noch keine Änderungen protokolliert",
  page: "Seite {page} von {pages} ({total} Einträge)",
};
