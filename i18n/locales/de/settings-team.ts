// Settings tab „Team-Zugang“: team access code, QR code and link, app name, week start, default language.
export default {
  intro:
    "Mit einem Zugangscode sieht nur dein Team den Schichtplan. Mitarbeitende brauchen kein eigenes Konto: Sie scannen den QR-Code, sehen den Plan und können Benachrichtigungen aktivieren. Ändern können Schichten weiterhin nur Planer und Admins.",
  codeActive: "Zugangscode aktiv",
  public: "Plan öffentlich lesbar",
  subscribers: "1 Gerät mit Push | {count} Geräte mit Push",
  setUp: "Zugangscode einrichten",
  saveFailed: "Zugangscode konnte nicht gespeichert werden",
  card: {
    qrLabel: "QR-Code für {link}",
    link: "Direktlink",
    copy: "Link kopieren",
    copied: "Kopiert",
    copyFailed: "Link konnte nicht kopiert werden",
    generate: "Neuen Code erzeugen",
    remove: "Code entfernen",
  },
  confirm: {
    removeHeader: "Zugangscode entfernen",
    firstHeader: "Zugangscode setzen",
    changeHeader: "Zugangscode ändern",
    remove: "Entfernen",
    first: "Code setzen",
    change: "Code ändern",
    removeText: "Der Schichtplan ist danach wieder für alle mit dem Link lesbar. Bestehende Benachrichtigungen bleiben aktiv.",
    firstText:
      "Benachrichtigungen, die ohne persönlichen Zugang aktiviert wurden, werden gelöscht. Das Team gibt den Code einmal ein und aktiviert sie erneut. {keepsPersonal}",
    changeText:
      "Alle Geräte mit dem alten Code werden abgemeldet und ihre Benachrichtigungen gelöscht. Das Team muss den neuen Code einmal eingeben und Benachrichtigungen erneut aktivieren. {keepsPersonal}",
    keepsPersonal: "Persönliche Zugänge bleiben angemeldet und behalten ihre Benachrichtigungen.",
  },
  customCode: { label: "Eigenen Code festlegen (optional)", placeholder: "mind. 6 Zeichen" },
  name: {
    label: "Name in der App",
    placeholder: "z. B. Pflegeteam Nord",
    saved: "Gespeichert",
    failed: "Name konnte nicht gespeichert werden",
  },
  weekStart: {
    label: "Ab Samstag die nächste Woche zeigen",
    hint: "Passt für Teams ohne Wochenendschichten. Arbeitet ihr am Samstag oder Sonntag, schalte es aus. Dann zeigen der Plan und „Heute“ bis Sonntag die laufende Woche.",
  },
  locale: {
    label: "Standardsprache",
    hint: "Gilt für alle, die selbst keine Sprache gewählt haben und deren Browser keine der angebotenen Sprachen nutzt, außerdem für die App und Kontakt-Mails.",
  },
};
