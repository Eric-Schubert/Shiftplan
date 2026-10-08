import { getValidationConfig } from "~/server/config/domain-config";
import { createValidationError } from "./error";

export function validateInteger(
  value: unknown,
  fieldName: string,
  options: {
    required?: boolean;
    min?: number;
    max?: number;
  } = {}
): number | undefined {
  const { required = false, min, max } = options;

  if (value === undefined || value === null) {
    if (required) {
      throw createValidationError(`${fieldName} ist erforderlich`);
    }
    return undefined;
  }

  const num = typeof value === "string" ? parseInt(value, 10) : Number(value);

  if (!Number.isInteger(num) || isNaN(num)) {
    throw createValidationError(`${fieldName} muss eine ganze Zahl sein`);
  }

  if (min !== undefined && num < min) {
    throw createValidationError(`${fieldName} darf nicht kleiner als ${min} sein`);
  }

  if (max !== undefined && num > max) {
    throw createValidationError(`${fieldName} darf nicht größer als ${max} sein`);
  }

  return num;
}

export function validateBoolean(
  value: unknown,
  fieldName: string,
  options: { required?: boolean } = {}
): number | undefined {
  const { required = false } = options;

  if (value === undefined || value === null) {
    if (required) {
      throw createValidationError(`${fieldName} ist erforderlich`);
    }
    return undefined;
  }

  if (value === true || value === 1) return 1;
  if (value === false || value === 0) return 0;

  throw createValidationError(`${fieldName} muss ein Wahrheitswert sein (0 oder 1)`);
}

export function validateYear(
  value: unknown,
  fieldName: string,
  options: { required?: boolean } = {}
): number | undefined {
  const range = getValidationConfig().year;

  return validateInteger(value, fieldName, {
    ...options,
    min: range.min,
    max: range.max,
  });
}

export function validateWeek(
  value: unknown,
  fieldName: string,
  options: { required?: boolean } = {}
): number | undefined {
  const range = getValidationConfig().week;

  return validateInteger(value, fieldName, {
    ...options,
    min: range.min,
    max: range.max,
  });
}

export function validateId(value: unknown, fieldName: string): number {
  const range = getValidationConfig().id;
  const id = validateInteger(value, fieldName, {
    required: true,
    min: range.min,
    max: range.max,
  });
  return id!;
}
