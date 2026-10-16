import { getValidationConfig } from "~/server/config/domain-config";
import { createValidationError, type FieldKey } from "./error";

type IntegerOptions = { required?: boolean; min?: number; max?: number };

/** A whole number, or its plain digits as text (route and query values). "12abc", "1e3", "5.9", true and [5] are not. */
function toInteger(value: unknown): number | null {
  if (typeof value === "number") return Number.isSafeInteger(value) ? value : null;
  if (typeof value !== "string" || !/^-?\d+$/.test(value)) return null;
  const num = Number(value);
  return Number.isSafeInteger(num) ? num : null;
}

// With `required: true` the validators throw instead of returning undefined.
export function validateInteger(value: unknown, field: FieldKey, options: IntegerOptions & { required: true }): number;
export function validateInteger(value: unknown, field: FieldKey, options?: IntegerOptions): number | undefined;
export function validateInteger(value: unknown, field: FieldKey, options: IntegerOptions = {}): number | undefined {
  const { required = false, min, max } = options;

  if (value === undefined || value === null) {
    if (required) {
      throw createValidationError("required", field);
    }
    return undefined;
  }

  const num = toInteger(value);

  if (num === null) {
    throw createValidationError("integer", field);
  }

  if (min !== undefined && num < min) {
    throw createValidationError("min", field, { min });
  }

  if (max !== undefined && num > max) {
    throw createValidationError("max", field, { max });
  }

  return num;
}

export function validateBoolean(value: unknown, field: FieldKey, options: { required: true }): number;
export function validateBoolean(value: unknown, field: FieldKey, options?: { required?: boolean }): number | undefined;
export function validateBoolean(value: unknown, field: FieldKey, options: { required?: boolean } = {}): number | undefined {
  const { required = false } = options;

  if (value === undefined || value === null) {
    if (required) {
      throw createValidationError("required", field);
    }
    return undefined;
  }

  if (value === true || value === 1) return 1;
  if (value === false || value === 0) return 0;

  throw createValidationError("boolean", field);
}

export function validateYear(value: unknown, field: FieldKey, options: { required: true }): number;
export function validateYear(value: unknown, field: FieldKey, options?: { required?: boolean }): number | undefined;
export function validateYear(value: unknown, field: FieldKey, options: { required?: boolean } = {}): number | undefined {
  const range = getValidationConfig().year;

  return validateInteger(value, field, {
    ...options,
    min: range.min,
    max: range.max,
  });
}

export function validateWeek(value: unknown, field: FieldKey, options: { required: true }): number;
export function validateWeek(value: unknown, field: FieldKey, options?: { required?: boolean }): number | undefined;
export function validateWeek(value: unknown, field: FieldKey, options: { required?: boolean } = {}): number | undefined {
  const range = getValidationConfig().week;

  return validateInteger(value, field, {
    ...options,
    min: range.min,
    max: range.max,
  });
}

export function validateId(value: unknown, field: FieldKey): number {
  const range = getValidationConfig().id;
  return validateInteger(value, field, {
    required: true,
    min: range.min,
    max: range.max,
  });
}
