import type de from "../de/common";

// Texts used across features. Messages use vue-i18n syntax: {param}, “one | many” plurals;
// write @ { } | $ as {'@'} {'{'} {'}'} {'|'} {'$'} when they are meant literally.
export default {
  meta: {
    description: "Shiftplan: plan shifts in the browser, view them as a team in the app.",
  },
  // Buttons and placeholders that read the same in every feature.
  actions: {
    activate: "Activate",
    back: "Back",
    cancel: "Cancel",
    close: "Close",
    create: "Create",
    deactivate: "Deactivate",
    decline: "Decline",
    delete: "Delete",
    done: "Done",
    edit: "Edit",
    next: "Next",
    retry: "Try again",
    save: "Save",
    signIn: "Sign in",
    signOut: "Sign out",
    toPlan: "Go to the plan",
  },
  choose: "Please choose",
  period: { from: "From", to: "To" },
  // Longest absence or swap a member enters at once.
  maxWeeks: "At most {weeks} weeks at a time.",
} satisfies typeof de;
