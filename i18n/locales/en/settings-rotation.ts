import type de from "../de/settings-rotation";

// Settings tab “Rotation patterns”: toolbar, the pattern board with staff pool and week cards, the start point.
export default {
  // Shared by the board, the wizard, the rollout and the year copy.
  patternWeek: "Pattern week {week}",
  cycle: "{weeks}-week cycle",
  assignments: "1 assignment | {count} assignments",
  toolbar: {
    start: "· starts in {week}",
    startWizard: "Start wizard",
    resumeWizard: "Resume wizard",
    resumeHint: "Adjust the pattern below. When everything is right, continue to the review with {resume}.",
    hint: "The wizard guides you through the pattern, the review and rolling out the weekly plans.",
  },
  intro: {
    title: "How the rotation pattern works:",
    text: "Set who works which shift in each week of the cycle. The pattern repeats on a {weeks} cycle.",
    weeks: "{count}-week",
    firstWeek: "Pattern week 1 starts in {week}",
  },
  pool: "Staff pool – drag and drop into shifts",
  week: {
    remove: "Remove {name} from pattern week {week}, shift {shift}",
    dropHere: "Drop here",
    add: "Add staff member to {shift} in pattern week {week}",
    addTitle: "Add staff member",
    missing: "{count} missing",
  },
  assign: {
    header: "Assign staff member",
    headerFor: "Add staff member to ‘{shift}’ (Week {week})",
    allAssigned: "All active staff members are already assigned.",
  },
  config: {
    weeksSuffix: " wk",
    startWeek: "Pattern week 1 is calendar week",
    inYear: "in year",
    preview: "{week} → pattern week {pattern}",
    save: "Save start point",
    failed: "Start point could not be saved",
    shrink: {
      header: "Shorten the cycle?",
      cycleWeeks: "1 week | {count} weeks",
      text: "The cycle shrinks from {from} to {to}. Pattern week {first} and its {assignments} are deleted for good. | The cycle shrinks from {from} to {to}. Pattern weeks {first} to {last} and their {assignments} are deleted for good.",
      confirm: "Shorten cycle",
    },
  },
} satisfies typeof de;
