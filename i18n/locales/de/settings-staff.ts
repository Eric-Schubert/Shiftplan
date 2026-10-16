// Settings tab „Mitarbeiter“: list and the create, edit, deactivate and delete dialogs.
export default {
  count: "{count} Mitarbeiter",
  create: "Neuer Mitarbeiter",
  partTime: "Teilzeit",
  fullTime: "Vollzeit",
  workingTime: "Arbeitszeit",
  edit: "Mitarbeiter bearbeiten",
  activate: "Mitarbeiter aktivieren",
  deactivate: "Mitarbeiter deaktivieren",
  delete: "Mitarbeiter löschen",
  form: {
    createHeader: "Mitarbeiter anlegen",
    namePlaceholder: "Vollständigen Namen eingeben",
    shortCodePlaceholder: "Leer lassen für Initialen",
    shortCodeHint: "Zum Anmelden mit PIN, 2 bis 8 Buchstaben oder Ziffern.",
    saveFailed: "Speichern fehlgeschlagen",
  },
  deactivateText:
    "{name} deaktivieren? Das meldet alle Geräte und Browser ab, löscht die PIN, zieht offene Anfragen zurück und entfernt die Planung ab der nächsten Woche. Erneutes Aktivieren stellt diese Planung nicht wieder her, und es ist ein neuer QR-Code nötig.",
  deleteText: "{name} wirklich löschen? Bereits geplante Einsätze dieses Mitarbeiters gehen dabei verloren.",
};
