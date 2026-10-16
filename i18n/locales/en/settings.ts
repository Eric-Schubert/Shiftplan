import type de from "../de/settings";
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
    staff: "Staff",
    shifts: "Shifts",
    rotation: "Rotation patterns",
    users: "Users",
    members: "App access",
    requests: "Requests",
    team: "Team access",
    analytics: "Visits",
    contact: "Contact",
    audit: "Audit log",
  },
  pager: { previous: "Previous page", next: "Next page" },
  // Columns and states of the staff, shift and user lists.
  list: { status: "Status", actions: "Actions", active: "Active", inactive: "Inactive" },
  loading: "Loading.",
  settingFailed: "The setting could not be saved",
  range: "{from} – {to}",
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
} satisfies typeof de;
