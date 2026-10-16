import type de from "../de/push";
import requests from "./push-requests";

// Push notifications. The OS shows them as sent, so each recipient gets them in their language.
export default {
  change: {
    teamTitle: "Shift plan changed",
    ownTitle: "Your shift has changed",
    // A change of a single day carries its date: “Early Tue 13/10”
    dayShift: "{shift} {day}",
    group: "{week} · {shift}",
    line: "{group}: {changes}",
    added: "added: {names}",
    removed: "removed: {names}",
    more: "… and {count} more change | … and {count} more changes",
    // App texts name no people: “Week 41: Early, Late”
    weekShifts: "{week}: {shifts}",
    weeks: "Changes in {weeks}",
  },
  absence: {
    title: "Absence in the team",
    days: "{name} is absent on {days}",
    shiftOpen: "{name} is absent on {days} – {shift} open",
    seekingTakeover: "{notice} – who can take over?",
  },
  team: {
    title: "Message from your planners",
  },
  // A takeover names its shift: “Late, Fri 09/10”; a swap only its days.
  requestShift: "{shift}, {days}",
  requests,
} satisfies typeof de;
