import type de from "../de/planner-shift";

// Shifts in the week: cards, the week grid and its legend, assignees and the day-change dialog.
// `{days}` is a formatted list of weekdays (“Mon, Wed–Fri”), `{day}` a formatted day.
export default {
  understaffed: "Understaffed",
  understaffedOn: "Understaffed {days}",
  open: "open",
  // A change on the plan that failed without a reason from the server.
  changeFailed: "The change to the plan could not be saved",
  grid: {
    shift: "Shift",
    substitute: "{name} (substitute)",
    editDays: "Change days in {shift}",
  },
  legend: {
    substitute: "substitute",
    understaffed: "understaffed",
    holiday: "public holiday",
  },
  assignees: {
    notOnDaysHint: "Not in {shift} on these days",
    notOn: "not {days}",
    remove: "Remove {name} from {shift}",
    guestHint: "Only on individual days in {shift}",
    onlyOn: "only {days}",
    addHint: "Add staff member to {shift}",
    add: "Add",
    editDaysHint: "Change individual days in {shift}",
    days: "Days",
  },
  assign: {
    header: "{shift} - Assign staff members",
    allAssigned: "All available staff members are already assigned to this shift.",
    partTime: "PT",
  },
  dayChange: {
    intro: "Tap a day to add or remove someone for that day only. The weekly plan stays the basis.",
    addPerson: "Another person for individual days",
    failed: "Change could not be saved",
    notInPlan: "not in the weekly plan",
    signOut: "Remove {name} on {day}",
    signIn: "Add {name} on {day}",
    legendAssigned: "assigned",
    legendOnlyDay: "only on this day",
    legendRemoved: "removed on this day",
  },
} satisfies typeof de;
