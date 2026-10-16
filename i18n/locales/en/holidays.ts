import type de from "../de/holidays";

// Public and school holidays next to the plan. Holiday names themselves come from the holiday API.
export default {
  loading: "Loading calendar information.",
  loadFailed: "Public holidays could not be loaded",
  none: "No public or school holidays this week.",
  public: "Public holidays",
  school: "School holidays",
  both: "Public and school holidays",
  thisWeek: "This week",
  // A holiday the API sent without any name.
  unnamed: "Unknown",
  // Short names for the narrow week grid, see utils/holiday.ts.
  short: {
    newYear: "New Year",
    labourDay: "Labour Day",
    germanUnity: "Unity Day",
    christmasDay: "Christmas",
    boxingDay: "Boxing Day",
    goodFriday: "Good Friday",
    easterSunday: "Easter",
    easterMonday: "Easter Mon",
    ascension: "Ascension",
    whitSunday: "Whitsun",
    whitMonday: "Whit Mon",
    repentance: "Repentance",
    reformation: "Reformation",
  },
} satisfies typeof de;
