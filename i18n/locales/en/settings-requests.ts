import type de from "../de/settings-requests";

// Settings tab “Requests”: takeover and swap requests the planning approves, reverts or follows.
export default {
  intro:
    "In the app, staff members can look for someone to take over a shift, or swap all shifts with a colleague for a period. The weekly plan stays unchanged; only the affected period changes.",
  approval: {
    label: "Approval by the planners",
    hint: "If this is off, a takeover or swap applies as soon as the colleague accepts. If it is on, the planners still have to approve it afterwards.",
  },
  approve: "Approve",
  revert: "Revert",
  recent: "Open and recent requests",
  empty: "No requests yet.",
  failed: "The request could not be changed",
  // One request in a line: who, which shift, who helps.
  summary: {
    takenBy: "{name} takes over",
    seeking: "looking for cover",
    swap: "{requester} ↔ {partner} swap all shifts",
  },
  decidedBy: "{status} · {name}",
  decidedByUndo: "{status} · {name} after an undo request",
} satisfies typeof de;
