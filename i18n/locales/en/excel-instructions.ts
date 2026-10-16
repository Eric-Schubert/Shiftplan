import type de from "../de/excel-instructions";

// The instruction sheet of the rotation template. {sheet} is a sheet name; {firstWeek}, {secondWeek} and
// {repeatWeek} are calendar weeks („KW 43“).
export default {
  title: "Instructions: filling in the rotation in Excel",
  sections: {
    before: "Before you start",
    steps: "In 3 steps",
    weeks: "What do “Pattern week 1”, “Pattern week 2” … mean?",
    tips: "Good to know",
  },
  app: {
    label: "In the app first",
    text: "Add all staff members and shifts and set the start week and cycle length. Only then download this template.",
  },
  // What the file was built from: „2 Mitarbeitende, 2 Schichten (Früh, Spät), 2-Wochen-Zyklus ab KW 1/2026.“
  contents: {
    label: "In this file",
    text: "{staff}, {shifts}, {cycle}-week cycle from {startWeek}.",
    noStaff: "no staff members (please add them in the app first)",
    staff: "{count} staff member | {count} staff members",
    noShifts: "no shifts (please add them in the app first)",
    shifts: "{count} shift ({names}) | {count} shifts ({names})",
  },
  missing: {
    label: "Something missing?",
    text: "Do not add it in Excel, the upload will not pick it up. Add it in the app and download the template again.",
  },
  open: {
    label: "1. Open",
    text: "Click the “{sheet}” tab at the bottom. Each row is a person, each column a week.",
  },
  fill: {
    label: "2. Fill in",
    text: "Click a yellow cell and choose the shift with the small arrow. Leaving it empty means: off. Press Delete to clear a cell.",
  },
  upload: {
    label: "3. Upload",
    text: "Save the file (as .xlsx) and upload it in the app. The app first shows you what it will apply.",
  },
  // {count} is the cycle length.
  repeat: {
    label: "Repetition",
    text: "The plan has only one week. It applies the same way every week. | The plan repeats every {count} weeks: pattern week 1, pattern week 2 … pattern week {count}, then pattern week 1 again.",
  },
  // {current} is excelTemplate.current.
  calendarWeeks: {
    label: "Calendar weeks",
    text: "The header of each column shows the calendar weeks it applies to next. {current}",
  },
  // {first} and {second} are the cells of week 1 and 2 (quoted or nothing), {firstShift} and
  // {secondShift} what that means (the shift or excel.labels.free).
  example: {
    label: "Example",
    oneWeek: "If {name} has {first} under pattern week 1, that applies every week: every week is {firstShift} for {name}.",
    weeks:
      "If {name} has {first} under pattern week 1 and {second} under pattern week 2, then {firstWeek} is {firstShift} for {name} and {secondWeek} is {secondShift}. After pattern week {cycle} it starts again with pattern week 1, so from {repeatWeek} it is {firstShift} again.",
    quoted: "“{shift}”",
    nothing: "nothing (off)",
  },
  twoShifts: {
    label: "Two shifts",
    text: "If someone works two shifts in one week, write both separated by a comma: “{shifts}”. Excel will then ask, just confirm with “Yes”.",
  },
  keep: {
    label: "Do not change",
    text: "The names in column A, the column headers “Pattern week …” and the sheet name “{sheet}”.",
  },
  replaces: {
    label: "When uploading",
    text: "The file replaces the whole rotation pattern in the app. Existing week plans only change once you roll out the pattern in the app.",
  },
} satisfies typeof de;
