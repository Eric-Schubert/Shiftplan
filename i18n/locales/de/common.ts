// Texts used across features. Messages use vue-i18n syntax: {param}, „one | many“ plurals;
// write @ { } | $ as {'@'} {'{'} {'}'} {'|'} {'$'} when they are meant literally.
export default {
  meta: {
    description: "Shiftplan: Dienstplan im Browser planen, im Team per App ansehen.",
  },
  // Buttons and placeholders that read the same in every feature.
  actions: {
    activate: "Aktivieren",
    back: "Zurück",
    cancel: "Abbrechen",
    close: "Schließen",
    create: "Erstellen",
    deactivate: "Deaktivieren",
    decline: "Ablehnen",
    delete: "Löschen",
    done: "Fertig",
    edit: "Bearbeiten",
    next: "Weiter",
    retry: "Erneut versuchen",
    save: "Speichern",
    signIn: "Anmelden",
    signOut: "Abmelden",
    toPlan: "Zum Schichtplan",
  },
  choose: "Bitte wählen",
  period: { from: "Von", to: "Bis" },
  // Longest absence or swap a member enters at once.
  maxWeeks: "Höchstens {weeks} Wochen am Stück.",
};
