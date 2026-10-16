// Settings tab „Benutzer“: planner and admin accounts, the create and delete dialogs.
export default {
  intro: "Verwalte Benutzer und deren Berechtigungen",
  create: "Neuer Benutzer",
  empty: "Keine Benutzer vorhanden",
  form: {
    usernamePlaceholder: "z.B. schichtleitung",
    caseSensitive: "Groß- und Kleinschreibung zählt bei der Anmeldung.",
    role: "Rolle",
    roles: { planner: "Planer – Darf Schichtzuweisungen ändern", admin: "Admin – Vollzugriff" },
    required: "Benutzername und Passwort sind erforderlich.",
    usernameTooShort: "Der Benutzername braucht mindestens {min} Zeichen.",
    failed: "Fehler beim Erstellen",
  },
  delete: "Benutzer löschen",
  deleteText: "Benutzer {name} wirklich löschen? Dieser Schritt kann nicht rückgängig gemacht werden.",
  deleteFailed: "Benutzer konnte nicht gelöscht werden.",
};
