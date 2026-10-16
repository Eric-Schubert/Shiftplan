import { getValidationConfig } from "~/server/config/domain-config";
import { apiError, messageRef, type MessageRef } from "~/server/utils/api-error";
import { createValidationError, fieldLabel, type FieldKey } from "./error";

type StringOptions = {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  patternMessage?: MessageRef;
};
type NameOptions = { required?: boolean; maxLength?: number };

// With `required: true` the validators throw instead of returning undefined.
export function validateString(value: unknown, field: FieldKey, options: StringOptions & { required: true }): string;
export function validateString(value: unknown, field: FieldKey, options?: StringOptions): string | undefined;
export function validateString(value: unknown, field: FieldKey, options: StringOptions = {}): string | undefined {
  const stringConfig = getValidationConfig().string;
  const { required = false, minLength = stringConfig.defaultMinLength, maxLength = stringConfig.defaultMaxLength } = options;

  if (value === undefined || value === null) {
    if (required) {
      throw createValidationError("required", field);
    }
    return undefined;
  }

  if (typeof value !== "string") {
    throw createValidationError("text", field);
  }

  const trimmed = value.trim();

  if (trimmed.length === 0 && required) {
    throw createValidationError("empty", field);
  }

  if (trimmed.length === 0) {
    return undefined;
  }

  if (trimmed.length < minLength) {
    throw createValidationError("minLength", field, { min: minLength });
  }

  if (trimmed.length > maxLength) {
    throw createValidationError("maxLength", field, { max: maxLength });
  }

  if (options.pattern && !options.pattern.test(trimmed)) {
    const custom = options.patternMessage;
    throw custom ? apiError(null, 400, custom.key, custom.params) : createValidationError("pattern", field);
  }

  return trimmed;
}

/**
 * A name as typed: the app escapes text when it shows it, so storing "&amp;" here grew on every save.
 * Control characters (a pasted line break or tab) become a space; they break the Excel file.
 */
export function sanitizeString(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f]+/g, " ").trim();
}

export function validateName(value: unknown, field: FieldKey, options: NameOptions & { required: true }): string;
export function validateName(value: unknown, field: FieldKey, options?: NameOptions): string | undefined;
export function validateName(value: unknown, field: FieldKey, options: NameOptions = {}): string | undefined {
  const { required = false, maxLength = getValidationConfig().name.defaultMaxLength } = options;

  const validated = validateString(value, field, {
    required,
    minLength: 1,
    maxLength,
  });

  if (validated === undefined) return undefined;

  // A name of control characters only is empty once they are gone.
  const name = sanitizeString(validated);
  if (name === "") {
    if (required) throw createValidationError("empty", field);
    return undefined;
  }
  return name;
}

export function validateTime(value: unknown, field: FieldKey, options: { required: true }): string;
export function validateTime(value: unknown, field: FieldKey, options?: { required?: boolean }): string | undefined;
export function validateTime(value: unknown, field: FieldKey, options: { required?: boolean } = {}): string | undefined {
  return validateString(value, field, {
    ...options,
    pattern: /^([01]\d|2[0-3]):[0-5]\d$/,
    patternMessage: messageRef("validation.time", { field: fieldLabel(field) }),
    maxLength: 5,
  });
}

export function validateColor(value: unknown, field: FieldKey, options: { required: true }): string;
export function validateColor(value: unknown, field: FieldKey, options?: { required?: boolean }): string | undefined;
export function validateColor(value: unknown, field: FieldKey, options: { required?: boolean } = {}): string | undefined {
  const defaultColor = getValidationConfig().shift.defaultColor;

  return validateString(value, field, {
    ...options,
    pattern: /^#[0-9a-fA-F]{6}$/,
    patternMessage: messageRef("validation.color", { field: fieldLabel(field), example: defaultColor }),
    maxLength: 7,
  });
}
