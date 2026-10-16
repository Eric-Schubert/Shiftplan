// Planner sign-in on the settings page, the demo hint and the change-password dialog.
export default {
  username: "Benutzername",
  password: "Passwort",
  // The password rules, until the instance config with its own hint has loaded.
  passwordHint: "Mindestens 8 Zeichen mit Groß-/Kleinbuchstaben und Zahl",
  login: {
    intro: "Melde dich an, um Schichten, Muster und Benutzer zu verwalten.",
    sessionExpired: "Deine Sitzung ist abgelaufen. Bitte melde dich neu an.",
    usernamePlaceholder: "z. B. schichtleitung",
    passwordPlaceholder: "Passwort eingeben",
    usernameMissing: "Bitte Benutzername eingeben",
    passwordMissing: "Bitte Passwort eingeben",
    failed: "Login fehlgeschlagen",
    error: "Fehler beim Login",
  },
  demo: {
    title: "Demo-Zugang",
    user: "Benutzer",
    reset: "Die Demo wird regelmäßig zurückgesetzt.",
    fill: "Zugangsdaten übernehmen",
  },
  changePassword: {
    done: "Passwort erfolgreich geändert.",
    current: "Aktuelles Passwort",
    currentPlaceholder: "Aktuelles Passwort eingeben",
    new: "Neues Passwort",
    repeat: "Neues Passwort bestätigen",
    repeatPlaceholder: "Neues Passwort wiederholen",
    allFields: "Alle Felder ausfüllen",
    mismatch: "Neue Passwörter stimmen nicht überein",
    failed: "Passwort konnte nicht geändert werden",
  },
};
