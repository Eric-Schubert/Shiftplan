import type de from "../de/settings-staff";

// Settings tab “Staff”: list and the create, edit, deactivate and delete dialogs.
export default {
  count: "1 staff member | {count} staff members",
  create: "New staff member",
  partTime: "Part-time",
  fullTime: "Full-time",
  workingTime: "Working hours",
  edit: "Edit staff member",
  activate: "Activate staff member",
  deactivate: "Deactivate staff member",
  delete: "Delete staff member",
  form: {
    createHeader: "Add staff member",
    namePlaceholder: "Enter full name",
    shortCodePlaceholder: "Leave empty for initials",
    shortCodeHint: "For signing in with a PIN, 2 to 8 letters or digits.",
    saveFailed: "Saving failed",
  },
  deactivateText:
    "Deactivate {name}? This signs out all devices and browsers, deletes the PIN and withdraws open requests. After reactivating, a new QR code is needed.",
  deleteText: "Are you sure you want to delete {name}? Shifts already planned for this staff member will be lost.",
} satisfies typeof de;
