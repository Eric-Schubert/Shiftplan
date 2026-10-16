import type de from "../de/errors-shiftplan";

// The week plan: assignments, generating weeks, copying a year and day changes.
export default {
  yearRequired: "A valid year is required",
  presentBoolean: "present must be true or false",
  sameYears: "Source and target year must not be the same",
  noPlans: "No shift plans found for {year}",
  noAssignments: "No assignments found in {year}",
  noSuchWeek: "{year} has no Week {week}",
} satisfies typeof de;
