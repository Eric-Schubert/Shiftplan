import type de from "../de/absence";

// Absences: reasons, the planner's dialogs and week panel, and the member's own report.
export default {
  // Labels of the wire values urlaub | privat | sonstiges, which stay as they are.
  reasons: { urlaub: "Annual leave", privat: "Personal", sonstiges: "Other" },
  reason: "Reason",
  add: "Add absence",
  teamSeesHint: "The team sees the name and period, never the reason.",
  dialog: {
    staff: "Staff member",
    note: "Note (optional)",
    privacy: "Only planners see the reason and note. They are deleted after 90 days.",
    maxAdmin: "At most 1 year at a time.",
    submit: "Add",
    missing: "Please choose a staff member and period",
    failed: "Absence could not be saved",
  },
  notify: {
    label: "Notify the team by push notification",
    placeholder: "Extra text, e.g. Who can take over?",
  },
  remove: {
    header: "Remove absence",
    day: "Delete the absence of {name} on {day}?",
    endToday: "End the absence of {name} ({period}) from today? The days up to yesterday stay recorded.",
    range: "Delete the absence of {name} ({period}) completely?",
    endTodayConfirm: "End from today",
    failed: "Absence could not be deleted",
  },
  panel: {
    title: "Absences this week",
    empty: "No absences reported.",
    isOut: "is absent",
    shiftOpen: "· {shift} open",
    viaApp: "via app",
    removeDay: "Delete absence of {name}",
    removeRange: "Delete period of {name}",
  },
  member: {
    report: "Report absence",
    weekendSome: "Saturday and Sunday are not recorded.",
    weekendAll: "Your team does not work at weekends, so no absence is needed.",
    reasonHint: "Only your planners see the reason.",
    notify: "Notify the team",
    seekTakeover: "Look for a takeover",
    seekTakeoverHint: "Colleagues can take over your shifts on these days.",
    message: "Extra text (optional)",
    failed: "Absence could not be reported",
    reported: {
      takeovers: "Absence reported, the team can take over your shifts.",
      notified: "Absence reported, the team has been notified.",
      plain: "Absence reported.",
    },
  },
} satisfies typeof de;
