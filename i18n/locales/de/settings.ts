import analytics from "./settings-analytics";
import auth from "./settings-auth";
import contact from "./settings-contact";
import members from "./settings-members";
import requests from "./settings-requests";
import rollout from "./settings-rollout";
import rotation from "./settings-rotation";
import shifts from "./settings-shifts";
import staff from "./settings-staff";
import team from "./settings-team";
import users from "./settings-users";
import wizard from "./settings-wizard";
import yearCopy from "./settings-year-copy";

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
  settingFailed: "Die Einstellung konnte nicht gespeichert werden",
  range: "{from} bis {to}",
  staff,
  shifts,
  auth,
  users,
  members,
  team,
  rotation,
  wizard,
  rollout,
  yearCopy,
  requests,
  analytics,
  contact,
};
