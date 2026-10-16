// App shell: push dialog and the team access gate.
export default {
  push: {
    header: "Benachrichtigungen",
    changeFailed: "Benachrichtigungen konnten nicht geändert werden",
    checking: "Status wird geprüft.",
    install: {
      intro:
        "Auf dem iPhone kommen Benachrichtigungen nur an, wenn der Schichtplan als App auf dem Home-Bildschirm liegt (ab iOS 16.4).",
      share: "In Safari auf {share} tippen.",
      shareLabel: "Teilen",
      add: "„Zum Home-Bildschirm“ wählen.",
      open: "Den Schichtplan vom Home-Bildschirm öffnen und dort auf die Glocke tippen.",
    },
    unsupported:
      "Dieser Browser unterstützt keine Push-Benachrichtigungen. Nutze zum Beispiel Chrome, Edge, Firefox oder Safari.",
    denied:
      "Benachrichtigungen sind für diese Seite blockiert. Erlaube sie in den Einstellungen des Browsers (iPhone: Einstellungen → Mitteilungen → Schichtplan) und lade die Seite neu.",
    intro:
      "Du bekommst eine Nachricht, wenn sich Schichten in dieser oder der nächsten Woche ändern oder die Planung das Team direkt anschreibt.",
    active: "Auf diesem Gerät aktiv.",
    disable: "Ausschalten",
    noAccess: "Kein Zugriff auf den Schichtplan",
  },
  teamAccess: {
    title: "Schichtplan öffnen",
    intro:
      "Gib den Zugangscode ein, den du von deiner Schichtplanung bekommen hast. Mit dem QR-Code geht es ohne Eintippen.",
    code: "Zugangscode",
    codeMissing: "Bitte Zugangscode eingeben",
    codeWrong: "Zugangscode ist falsch",
    open: "Plan öffnen",
    memberLogin: "Mit Kürzel und PIN anmelden",
    plannerLogin: "Als Planer anmelden",
    linkExpired: "Der Zugangscode aus dem Link ist nicht mehr gültig.",
  },
};
