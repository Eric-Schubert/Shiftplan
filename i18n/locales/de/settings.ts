import shifts from "./settings-shifts";
import staff from "./settings-staff";

// The settings page: tabs and what several tabs share. Each tab has its own file, read as settings.<tab>.*.
export default {
  tabs: {
    staff: "Mitarbeiter",
    shifts: "Schichten",
    rotation: "Rotationsmuster",
    users: "Benutzer",
    members: "App-Zugänge",
    requests: "Anfragen",
    team: "Team-Zugang",
    analytics: "Besuche",
    contact: "Kontakt",
    audit: "Änderungslog",
  },
  pager: { previous: "Vorherige Seite", next: "Nächste Seite" },
  // Columns and states of the staff, shift and user lists.
  list: { status: "Status", actions: "Aktionen", active: "Aktiv", inactive: "Inaktiv" },
  loading: "Wird geladen.",
  staff,
  shifts,
};
