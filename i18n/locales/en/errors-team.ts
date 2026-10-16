import type de from "../de/errors-team";

// The team access code and the instance settings next to it.
export default {
  codeRequired: "Access code is required",
  codeWrong: "Access code is incorrect",
  codeWhitespace: "Access code must not contain spaces",
  nextWeekFromSaturdayBoolean: "nextWeekFromSaturday must be true or false",
  localeUnknown: "This language is not available here",
} satisfies typeof de;
