// App shell: push dialog, team access gate, layout, settings page frame and error page.
export default {
  push: {
    header: "Benachrichtigungen",
    changeFailed: "Benachrichtigungen konnten nicht geändert werden",
    checking: "Status wird geprüft.",
    install: {
      intro: "Auf dem iPhone kommen Benachrichtigungen nur an, wenn der Schichtplan als App auf dem Home-Bildschirm liegt (ab iOS 16.4).",
      share: "In Safari auf {share} tippen.",
      shareLabel: "Teilen",
      add: "„Zum Home-Bildschirm“ wählen.",
      open: "Den Schichtplan vom Home-Bildschirm öffnen und dort auf die Glocke tippen.",
    },
    unsupported: "Dieser Browser unterstützt keine Push-Benachrichtigungen. Nutze zum Beispiel Chrome, Edge, Firefox oder Safari.",
    denied:
      "Benachrichtigungen sind für diese Seite blockiert. Erlaube sie in den Einstellungen des Browsers (iPhone: Einstellungen → Mitteilungen → Schichtplan) und lade die Seite neu.",
    intro: "Du bekommst eine Nachricht, wenn sich Schichten in dieser oder der nächsten Woche ändern oder die Planung das Team direkt anschreibt.",
    active: "Auf diesem Gerät aktiv.",
    failed: "Der Server hat die Anmeldung dieses Geräts für Benachrichtigungen nicht angenommen, deshalb kommt hier nichts an. Versuch es noch einmal.",
    disable: "Ausschalten",
    noAccess: "Kein Zugriff auf den Schichtplan",
  },
  teamAccess: {
    title: "Schichtplan öffnen",
    intro: "Gib den Zugangscode ein, den du von deiner Schichtplanung bekommen hast. Mit dem QR-Code geht es ohne Eintippen.",
    code: "Zugangscode",
    codeMissing: "Bitte Zugangscode eingeben",
    open: "Plan öffnen",
    memberLogin: "Mit Kürzel und PIN anmelden",
    plannerLogin: "Als Planer anmelden",
    linkExpired: "Der Zugangscode aus dem Link ist nicht mehr gültig.",
  },
  layout: {
    skipToContent: "Zum Inhalt springen",
    roles: { admin: "Admin", planner: "Planer" },
    changelog: "Versionsverlauf anzeigen",
    push: { on: "Benachrichtigungen aktiv", off: "Benachrichtigungen einrichten" },
    theme: { light: "Hellen Modus aktivieren", dark: "Dunklen Modus aktivieren" },
    settings: { open: "Einstellungen öffnen", back: "Zurück zum Schichtplan" },
    imprint: "Impressum",
    privacy: "Datenschutz",
    language: "Sprache",
    dataFailed: "Mitarbeiter, Schichten und Rotationsmuster konnten nicht geladen werden.",
  },
  settingsPage: {
    checking: "Session wird geprüft.",
    noAccess: "Kein Zugriff",
    noAccessText: "Dieser Bereich ist nur für Planer und Administratoren verfügbar.",
    title: "Einstellungen",
    intro: {
      admin: "Mitarbeiter, Schichten, Benutzer und Rotationsmuster werden hier zentral gepflegt.",
      planner: "Rotationsmuster können gepflegt und Schichtpläne aus Vorlagen erzeugt werden.",
    },
    changePassword: "Passwort ändern",
  },
  // Shown and sent to the push relay while the planner has not named the instance; never stored.
  instance: { defaultName: "Schichtplaner" },
  // Name and description of the installed web app (server/routes/manifest.json.ts).
  manifest: {
    name: "Shiftplan",
    shortName: "Shiftplan",
    description: "Dienstplan im Browser planen, im Team per App ansehen.",
  },
  error: {
    title: { notFound: "Seite nicht gefunden · Shiftplan", other: "Fehler · Shiftplan" },
    code: "Fehler {code}",
    heading: { notFound: "Diese Seite gibt es nicht", other: "Da ist etwas schiefgelaufen" },
    text: {
      notFound: "Der Link ist veraltet oder vertippt. Der Schichtplan selbst ist weiter erreichbar.",
      other: "Der Server hat die Anfrage nicht verarbeitet. Lade die Seite neu oder versuch es gleich noch mal.",
    },
  },
};
