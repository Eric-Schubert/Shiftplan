import type de from "../de/errors-common";

// Errors that several features share.
export default {
  badOrigin: "Invalid request origin",
  jsonRequired: "Request must contain JSON",
  tooLarge: "The request is too large",
  tooManyAttempts: "Too many attempts. Please wait.",
  notFound: "Not found",
  noChanges: "No changes specified",
  assignFailed: "Assignment failed",
  invalidDate: "Invalid date",
  unknownStaff: "Unknown staff member",
  unknownShift: "Unknown shift",
} satisfies typeof de;
