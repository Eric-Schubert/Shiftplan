import { integerAt, objectAt, stringAt, type MutableErrorList } from "./fields";
import { rangeOrder, validateDefaultRange, validateRange } from "./ranges";

export function validateValidation(value: unknown, errors: MutableErrorList): void {
  const config = objectAt(value, "validation", errors);
  const strings = objectAt(config.string, "validation.string", errors);
  integerAt(strings.defaultMinLength, "validation.string.defaultMinLength", errors, { min: 0 });
  integerAt(strings.defaultMaxLength, "validation.string.defaultMaxLength", errors, { min: 1 });
  rangeOrder(strings.defaultMinLength, strings.defaultMaxLength, "validation.string", errors);

  const name = objectAt(config.name, "validation.name", errors);
  integerAt(name.defaultMaxLength, "validation.name.defaultMaxLength", errors, { min: 1 });
  validateRange(config.year, "validation.year", errors);
  validateRange(config.week, "validation.week", errors);
  validateRange(config.id, "validation.id", errors);

  const shift = objectAt(config.shift, "validation.shift", errors);
  stringAt(shift.defaultColor, "validation.shift.defaultColor", errors);
  if (typeof shift.defaultColor === "string" && !/^#[0-9a-fA-F]{6}$/.test(shift.defaultColor)) {
    errors.push("validation.shift.defaultColor muss ein Hex-Farbwert sein");
  }
  validateDefaultRange(shift.minStaff, "validation.shift.minStaff", errors);
  validateDefaultRange(shift.sortOrder, "validation.shift.sortOrder", errors);
}

export function validateRotation(value: unknown, errors: MutableErrorList): void {
  const config = objectAt(value, "rotation", errors);
  integerAt(config.defaultCycleLength, "rotation.defaultCycleLength", errors, { min: 1 });
  integerAt(config.defaultStartWeek, "rotation.defaultStartWeek", errors, { min: 1, max: 53 });
  integerAt(config.cycleLengthMin, "rotation.cycleLengthMin", errors, { min: 1 });
  integerAt(config.cycleLengthMax, "rotation.cycleLengthMax", errors, { min: 1 });
  integerAt(config.excelImportMaxBytes, "rotation.excelImportMaxBytes", errors, { min: 1 });
  rangeOrder(config.cycleLengthMin, config.cycleLengthMax, "rotation.cycleLength", errors);
}

export function validateShiftplan(value: unknown, errors: MutableErrorList): void {
  const config = objectAt(value, "shiftplan", errors);
  integerAt(config.generateWeeksMin, "shiftplan.generateWeeksMin", errors, { min: 1 });
  integerAt(config.generateWeeksMax, "shiftplan.generateWeeksMax", errors, { min: 1 });
  rangeOrder(config.generateWeeksMin, config.generateWeeksMax, "shiftplan.generateWeeks", errors);
}

export function validateXlsx(value: unknown, errors: MutableErrorList): void {
  const config = objectAt(value, "xlsx", errors);
  for (const key of [
    "maxZipEntryCount",
    "maxZipEntryUncompressedBytes",
    "maxZipTotalUncompressedBytes",
    "maxZipExpansionRatio",
    "maxWorksheetCount",
    "maxWorksheetRows",
    "maxWorksheetColumns",
  ]) {
    integerAt(config[key], `xlsx.${key}`, errors, { min: 1 });
  }
}

export function validateAudit(value: unknown, errors: MutableErrorList): void {
  const config = objectAt(value, "audit", errors);
  integerAt(config.defaultLimit, "audit.defaultLimit", errors, { min: 1 });
  integerAt(config.maxLimit, "audit.maxLimit", errors, { min: 1 });
  rangeOrder(config.defaultLimit, config.maxLimit, "audit", errors);
}
