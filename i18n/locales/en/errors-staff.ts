import type de from "../de/errors-staff";

// Staff and shift records.
export default {
  shortCodeFormat: "Short code: 2 to 8 letters or digits",
  shortCodeTaken: "The short code {code} is already taken",
} satisfies typeof de;
