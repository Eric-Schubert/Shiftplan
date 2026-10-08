import { getConfig, updateConfig } from "~/server/services/rotation/config";
import {
  assignToPattern,
  getFullPattern,
  getPatternForWeek,
  replacePattern,
  unassignFromPattern,
} from "~/server/services/rotation/pattern";
import { calculatePatternWeek, getISOWeekStartDate, weeksBetween } from "~/server/services/rotation/weeks";

export const RotationService = {
  getConfig,
  updateConfig,
  getFullPattern,
  assignToPattern,
  unassignFromPattern,
  replacePattern,
  calculatePatternWeek,
  weeksBetween,
  getISOWeekStartDate,
  getPatternForWeek,
};
