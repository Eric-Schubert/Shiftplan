import type de from "../de/push-requests";

// Pushes about takeover and swap requests. {name} is the person who acted, {request} the shift
// and days (“Late, Fri 09/10”). Every entry has a title and a body.
export default {
  takeoverWanted: { title: "Takeover wanted", body: "{name} is looking for cover: {request}" },
  swapAsked: { title: "Swap request", body: "{name} would like to swap shifts with you ({request})." },
  takeoverPromised: {
    title: "Takeover accepted",
    body: "{name} has accepted ({request}). Your planners still need to approve it.",
  },
  swapPromised: {
    title: "Swap accepted",
    body: "{name} has accepted ({request}). Your planners still need to approve it.",
  },
  takenOver: { title: "Shift taken over", body: "{name} is taking over {request}." },
  swapAgreed: { title: "Swap agreed", body: "{name} has agreed to the swap ({request})." },
  takeoverApproved: { title: "Request approved", body: "Your planners have approved the takeover ({request})." },
  swapApproved: { title: "Request approved", body: "Your planners have approved the swap ({request})." },
  rejected: { title: "Request declined", body: "Your planners have not approved {request}." },
  takeoverReverted: { title: "Request reverted", body: "Your planners have reverted the takeover ({request})." },
  swapReverted: { title: "Request reverted", body: "Your planners have reverted the swap ({request})." },
  takeoverUndoAsked: {
    title: "Undo requested",
    body: "{name} would like to undo the takeover ({request}). Please confirm or decline.",
  },
  swapUndoAsked: {
    title: "Undo requested",
    body: "{name} would like to undo the swap ({request}). Please confirm or decline.",
  },
  undoConfirmed: { title: "Undo confirmed", body: "{name} has confirmed the undo. {request} is back as it was." },
  undoDeclined: { title: "Undo declined", body: "{name} would like to leave {request} as it is." },
  swapDeclined: { title: "Swap declined", body: "{name} cannot swap {request}." },
  takeoverWithdrawn: {
    title: "Acceptance withdrawn",
    body: "{name} is not taking over {request} after all. The takeover is open again.",
  },
  swapWithdrawn: { title: "Acceptance withdrawn", body: "{name} no longer wants to swap {request}." },
  cancelled: { title: "Request withdrawn", body: "{name} has withdrawn the request ({request})." },
} satisfies typeof de;
