import type de from "../de/errors-holidays";

// Public and school holidays.
export default {
  yearRequired: 'Parameter "year" is required',
  publicFailed: "Public holidays could not be fetched right now",
  schoolFailed: "School holidays could not be fetched right now",
  unknownState: "Unknown federal state: {code}",
} satisfies typeof de;
