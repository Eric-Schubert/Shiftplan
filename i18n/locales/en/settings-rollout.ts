import type de from "../de/settings-rollout";

// Last wizard step: rolling the pattern out into weekly plans, with range, overwrite choice and preview.
export default {
  range: {
    fromWeek: "From week",
    pastStart: "The start week is in the past (today is in {week}).",
    until: "Until when?",
    yearEnd: "Until the end of the year",
    count: "A set number of weeks",
  },
  overwrite: {
    planned: "Weeks already planned: {weeks}.",
    plannedWeeks: "{planned} of {total}",
    label: "Overwrite planned weeks",
    on: "These weeks are filled again completely from the pattern. Manual changes in them are lost.",
    off: "Off: planned weeks stay as they are. Only empty weeks are filled.",
  },
  dayChanges:
    "There is 1 day change in this period (e.g. a swap or takeover). It is kept and still applies on top of the weekly plan. | There are {count} day changes in this period (e.g. swaps or takeovers). They are kept and still apply on top of the weekly plan.",
  preview: {
    title: "Preview",
    new: "New",
    overwritten: "Will be overwritten",
    kept: "Stays as planned",
  },
  // The result line reads “3 weeks created, 1 of them overwritten, 2 already planned and skipped”
  result: {
    generated: "1 week created | {count} weeks created",
    overwritten: ", {count} of them overwritten",
    skipped: ", {count} already planned and skipped",
    nothing: "All weeks were already planned, nothing changed.",
  },
  submit: {
    loading: "Loading preview …",
    nothing: "Nothing to do",
    weeks: "Roll out 1 week | Roll out {count} weeks",
    overwriting: "{label} (overwrite {count})",
  },
  previewFailed: "Preview could not be loaded",
  failed: "Rollout failed. Nothing was changed.",
} satisfies typeof de;
