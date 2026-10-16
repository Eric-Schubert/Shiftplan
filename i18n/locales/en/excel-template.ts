import type de from "../de/excel-template";
import instructions from "./excel-instructions";

// The rotation template (server/services/rotation-excel). The import reads the sheet name „rotation“
// and the labels in excel.labels back in every language, so a file stays importable after a switch.
export default {
  fileName: "shiftplan-rotation-template.xlsx",
  sheets: {
    instructions: "Instructions",
    rotation: "Rotation",
    shifts: "Shifts",
  },
  title: "Rotation: who works which shift in which week?",
  hint: "Fill in the yellow cells: click a cell and choose the shift with the small arrow. An empty cell means off. More on this in the “{sheet}” sheet.",
  startYearHint: "Year in which pattern week 1 applies for the first time",
  startWeekHint: "Calendar week in which pattern week 1 applies for the first time",
  cycleLengthHint: "After this many weeks the plan starts again at pattern week 1",
  incomplete: "Not everything is set up yet: first add staff members and shifts in the app, then download the template again.",
  // {week} is the calendar week with its year: „KW 42/2026“.
  current: "This week ({week}) is pattern week {patternWeek}.",
  time: "Time",
  minStaff: "Minimum staffing",
  dropdown: {
    prompt: "Choose a shift or leave it empty (= off).",
    warning: "This shift is not in the list. For two shifts in one week, separate them with a comma, e.g. “{shifts}”.",
  },
  // Stand-ins for the instructions while no person or shift exists yet.
  example: {
    name: "Anna Example",
    early: "Early",
    late: "Late",
  },
  instructions,
} satisfies typeof de;
