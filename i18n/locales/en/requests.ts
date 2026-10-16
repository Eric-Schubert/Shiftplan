import type de from "../de/requests";

// Takeover and swap requests between staff: status labels, the member's list, the new-request dialog.
export default {
  status: {
    open: "Open",
    pending_approval: "Awaiting approval",
    done: "Completed",
    declined: "Declined (colleague)",
    rejected: "Declined (planners)",
    cancelled: "Withdrawn",
    reverted: "Reverted",
  },
  list: {
    undoForMe: "Undo requests for you",
    undoDetail: "{period} · should go back to how it was",
    confirmUndo: "Confirm undo",
    takeoversOpen: "Takeover wanted",
    take: "Take over",
    swapsForMe: "Swap requests for you",
    wantsToSwap: "{name} would like to swap",
    allShifts: "All shifts, {period}",
    accept: "Accept",
    mine: "Your requests and acceptances",
    takenBy: "taking over: {name}",
    undoAsked: "Undo requested",
  },
  // What the member can do with an own request.
  own: {
    cancel: "Withdraw",
    withdrawAccept: "Withdraw acceptance",
    withdrawUndo: "Withdraw undo request",
    undo: "Undo",
  },
  // Confirmation after an action, by the action sent to the server.
  notice: {
    cancel: "Withdrawn.",
    decline: "Swap declined.",
    request_undo: "Undo requested. The other person still needs to confirm.",
    confirm_undo: "Undo confirmed, the plan is back as it was.",
    decline_undo: "Undo declined, everything stays as it is.",
    accepted: "Accepted. Your planners still need to approve it.",
    done: "Done, the plan has been updated.",
    sent: "Request sent.",
  },
  takeoverConfirm: {
    header: "Take over shift?",
    text: "You will take over {shift} on {period} for {name}. If you have a shift of your own that day, you will be removed from it.",
  },
  dialog: {
    header: "New request",
    kind: "Type of request",
    takeover: "Give away shift",
    swap: "Swap shifts",
    takeoverIntro: "The team gets notified. Whoever accepts first takes over your shift on this day.",
    day: "Day",
    shift: "Shift",
    myShift: "My shift that day",
    swapIntro: "You swap all shifts in this period. The plan only changes once the other person accepts.",
    partner: "Swap with",
    noWeekend: "Saturday and Sunday are not swapped.",
    message: "Message (optional)",
    send: "Send request",
    choosePartner: "Please choose who you want to swap with",
    failed: "Request could not be sent",
  },
} satisfies typeof de;
