import type de from "../de/errors-absences";

// Absences reported by members or entered by the planners.
export default {
  notFound: "Absence not found",
  invalidReason: "Invalid reason",
  invalidShift: "Invalid shift",
  rangeTooLongWeeks: "Invalid date range (8 weeks at most)",
  rangeTooLongYear: "Invalid date range (1 year at most)",
  onlyFromToday: "Absences can only be reported from today onwards",
  weekendOff: "Your team does not work at weekends, so no absence is needed",
  noteTooLong: "Note can have at most {max} characters",
  dayTaken: "An absence has already been entered for this day",
  rangeTaken: "Absences have already been entered for this period",
  pastCancel: "Past absences cannot be withdrawn",
} satisfies typeof de;
