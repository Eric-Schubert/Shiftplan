import { getBackendConfig } from "./backend-config";

export function getValidationConfig() {
  return getBackendConfig().validation;
}

export function getShiftDefaults() {
  const shift = getValidationConfig().shift;

  return {
    color: shift.defaultColor,
    minStaff: shift.minStaff.default,
    sortOrder: shift.sortOrder.default,
  };
}

export function getShiftValidationConfig() {
  return getValidationConfig().shift;
}

export function getRotationDefaults() {
  const rotation = getBackendConfig().rotation;

  return {
    cycleLength: rotation.defaultCycleLength,
    startWeek: rotation.defaultStartWeek,
  };
}

export function getRotationValidationConfig() {
  return getBackendConfig().rotation;
}

export function getShiftplanGenerationConfig() {
  return getBackendConfig().shiftplan;
}

export function getXlsxConfig() {
  return getBackendConfig().xlsx;
}

export function getAuditConfig() {
  return getBackendConfig().audit;
}
