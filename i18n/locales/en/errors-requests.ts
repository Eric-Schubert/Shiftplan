import type de from "../de/errors-requests";

// Takeover and swap requests between members, the planners' approval and the undo flow.
// `{name}` is a staff name, `{day}` an already formatted day.
export default {
  notFound: "Request not found",
  kindInvalid: "kind must be takeover or swap",
  memberActionInvalid: "action must be accept, decline, cancel, request_undo, confirm_undo or decline_undo",
  plannerActionInvalid: "action must be approve, reject or revert",
  requiresApprovalBoolean: "requiresApproval must be true or false",
  // Creating a request
  dayPassed: "The day is in the past",
  weekendOff: "Your team does not work at weekends",
  noShiftThatDay: "You have no shift on this day",
  chooseShift: "Please choose the shift",
  notYourShift: "You do not have this shift on that day",
  duplicate: "There is already an open request for this shift",
  swapWithSelf: "You can only swap with someone else",
  unknownPartner: "Unknown colleague",
  invalidRange: "Invalid date range ({weeks} weeks at most)",
  rangePassed: "The period is in the past",
  nothingToSwap: "There is nothing to swap in this period",
  duplicateSwap: "There is already an open swap request with this person for this period",
  absent: "{name} has entered an absence on {day}",
  // Answering a request
  notOpen: "The request is no longer open",
  expired: "The request has expired",
  alreadyClosed: "The request is already closed",
  alreadyHandled: "The request has already been handled in the meantime",
  ownShift: "You cannot take over your own shift",
  selfAbsent: "You have entered an absence yourself on that day",
  alreadyInShift: "You are already in this shift on that day",
  requesterLeftShift: "{name} is no longer in this shift on that day",
  partnerInShift: "{name} is already in this shift on that day",
  nothingLeftToSwap: "There is nothing left to swap in this period",
  daysPassed: "The days of the request are already in the past",
  // Planner approval and revert
  notAwaitingApproval: "The request is not awaiting approval",
  revertOnlyDone: "Only completed requests can be reverted",
  planMovedPlanner: "The plan has changed since then, e.g. through a later request. Please adjust the days directly in the plan.",
  // Undo between the two members
  planMovedMember: "The plan has changed since then. Please contact your planners.",
  undoOnlyDone: "Only completed requests can be undone",
  undoDayBefore: "Undo is only possible until the day before",
  undoNotInTeam: "{name} is no longer in the team",
  undoAbsent: "{name} is absent on that day and cannot undo anything",
  undoAlreadyAsked: "An undo has already been requested",
  undoNotAsked: "No undo has been requested",
  undoOtherConfirms: "The other person has to confirm the undo",
} satisfies typeof de;
