import type de from "../de/settings-wizard";

// Rotation wizard: steps, the current pattern, the Excel import and the review step.
export default {
  header: "Rotation wizard",
  steps: {
    pattern: { title: "Pattern", text: "Keep it or import from Excel" },
    review: { title: "Review", text: "See staffing per pattern week" },
    rollout: { title: "Roll out", text: "Create weekly plans" },
  },
  rolloutIntro:
    "Creates the weekly plans from the pattern. Weeks that are already planned stay untouched unless you explicitly choose “Overwrite planned weeks”.",
  current: {
    title: "Current pattern",
    firstWeek: "Pattern week 1 = {week}",
    thisWeek: "This week ({week}) is pattern week {pattern}.",
    changeStart: "Change start point",
  },
  excel: {
    title: "Import pattern from Excel",
    optional: "(optional)",
    intro: "Only needed if you prefer to maintain the pattern in Excel. Otherwise just click {next}.",
    howTo: {
      prepare:
        "1. Set everything up first: staff members and shifts in the settings, start week and cycle length up here. The template only contains what already exists when you download it.",
      download: "2. Download the template; it contains the current pattern.",
      fill: "3. In Excel, choose the shift for each person in each week and save.",
      upload: "4. Upload it. Before anything is replaced, you see what will be imported.",
    },
    download: "Download template",
    upload: "Upload completed file",
    fileOk: "“{file}” looks good.",
    replaceText:
      "New pattern: {cycle}, pattern week 1 = {week}, {assignments}. It replaces the current pattern ({current}). Weekly plans stay unchanged until you roll them out in the last step.",
    replace: "Replace pattern",
    downloadFailed: "Template could not be loaded",
    readFailed: "The file could not be read",
    importFailed: "Import failed, the pattern is unchanged",
  },
  review: {
    imported: "Pattern imported: {assignments}.",
    understaffed:
      "{count} shift in the pattern is below minimum staffing. | {count} shifts in the pattern are below minimum staffing.",
    allStaffed: "All shifts in the pattern are staffed.",
    editBoard: "Edit on the board",
    thisWeek: "this week",
    unstaffed: "unstaffed",
    staffedOf: "{count} of {min}",
  },
} satisfies typeof de;
