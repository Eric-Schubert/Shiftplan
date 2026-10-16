import type de from "../de/settings-shifts";

// Settings tab “Shifts”: list, the create and edit dialog with its colour picker, the delete dialog.
export default {
  count: "1 shift | {count} shifts",
  create: "New shift",
  time: "Time",
  timeRange: "{start} – {end}",
  minStaffShort: "Min. staff",
  minStaffTag: "Min. staff: {count}",
  edit: "Edit shift",
  activate: "Activate shift",
  deactivate: "Deactivate shift",
  delete: "Delete shift",
  form: {
    createHeader: "Create shift",
    namePlaceholder: "e.g. Early shift",
    start: "Start time",
    end: "End time",
    chooseColor: "Choose colour {color}",
  },
  deleteText: "Are you sure you want to delete {name}? Existing assignments of this shift will be lost.",
} satisfies typeof de;
