import coreSchema from "./001-core-schema.js";
import rotationSchema from "./002-rotation-schema.js";
import auditSchema from "./003-audit-schema.js";
import pageVisitsSchema from "./004-page-visits-schema.js";
import absencesSchema from "./005-absences-schema.js";
import absenceRangesDayChanges from "./006-absence-ranges-day-changes.js";
import shiftRequests from "./007-shift-requests.js";
import staffShortCode from "./008-staff-short-code.js";

// Order matters: migrations run top to bottom and are recorded by id.
export const MAIN_MIGRATIONS = [
  coreSchema,
  rotationSchema,
  auditSchema,
  pageVisitsSchema,
  absencesSchema,
  absenceRangesDayChanges,
  shiftRequests,
  staffShortCode,
];
