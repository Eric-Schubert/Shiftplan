// Shifts in the week: cards, the week grid and its legend, assignees and the day-change dialog.
// `{days}` is a formatted list of weekdays („Mo, Mi–Fr“), `{day}` a formatted day.
export default {
  understaffed: "Unterbesetzt",
  understaffedOn: "Unterbesetzt {days}",
  open: "offen",
  grid: {
    shift: "Schicht",
    substitute: "{name} (Vertretung)",
    editDays: "Tage in {shift} ändern",
  },
  legend: {
    substitute: "Vertretung",
    understaffed: "unterbesetzt",
    holiday: "Feiertag",
  },
  assignees: {
    notOnDaysHint: "An diesen Tagen nicht in {shift}",
    notOn: "nicht {days}",
    remove: "{name} aus {shift} entfernen",
    guestHint: "Nur an einzelnen Tagen in {shift}",
    onlyOn: "nur {days}",
    addHint: "Mitarbeiter zu {shift} hinzufügen",
    add: "Hinzufügen",
    editDaysHint: "Einzelne Tage in {shift} ändern",
    days: "Tage",
  },
  assign: {
    header: "{shift} - Mitarbeiter zuweisen",
    allAssigned: "Alle verfügbaren Mitarbeiter sind dieser Schicht bereits zugeordnet.",
    partTime: "TZ",
  },
  dayChange: {
    intro: "Tippe auf einen Tag, um jemanden nur an diesem Tag ein- oder auszutragen. Der Wochenplan bleibt die Grundlage.",
    addPerson: "Weitere Person für einzelne Tage",
    done: "Fertig",
    failed: "Änderung konnte nicht gespeichert werden",
    notInPlan: "nicht im Wochenplan",
    signOut: "{name} am {day} austragen",
    signIn: "{name} am {day} eintragen",
    legendAssigned: "eingeteilt",
    legendOnlyDay: "nur an diesem Tag",
    legendRemoved: "an diesem Tag ausgetragen",
  },
};
