export { AbsenceService } from "~/server/services/absence/store";
export {
  ABSENCE_ADMIN_MAX_DAYS,
  ABSENCE_MAX_DAYS,
  ABSENCE_NOTE_MAX_LENGTH,
  ABSENCE_REASONS,
  type Absence,
  type AbsenceReason,
  type PublicAbsence,
} from "~/server/services/absence/model";
export { ABSENCE_MESSAGE_MAX_LENGTH } from "~/server/services/absence/notice";
export { cancelAbsence } from "~/server/services/absence/cancel";
export { reportAbsence } from "~/server/services/absence/report";
export { purgeOldReasons } from "~/server/services/absence/purge";
