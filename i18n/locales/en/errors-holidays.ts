import type de from "../de/errors-holidays";

// Public and school holidays. `{detail}` is the upstream error, not translated.
export default {
  yearRequired: 'Parameter "year" is required',
  publicFailed: "Could not fetch public holidays: {detail}",
  schoolFailed: "Could not fetch school holidays: {detail}",
  unknownState: "Unknown federal state: {code}",
} satisfies typeof de;
