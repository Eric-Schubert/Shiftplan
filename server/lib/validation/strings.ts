import { getValidationConfig } from "~/server/config/domain-config";
import { messageRef, type MessageRef } from "~/server/utils/api-error";
import { createValidationError, fieldError, type FieldKey } from "./error";

export function validateString(
  value: unknown,
  field: FieldKey,
  options: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    patternMessage?: MessageRef;
  } = {}
): string | undefined {
  const stringConfig = getValidationConfig().string;
  const {
    required = false,
    minLength = stringConfig.defaultMinLength,
    maxLength = stringConfig.defaultMaxLength,
  } = options;

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
    throw custom ? fieldError(custom.key, field, custom.params) : createValidationError("pattern", field);
  }

  return trimmed;
}

export function sanitizeString(value: string): string {
  return value
    .replace(/[<>]/g, "")
    .replace(/&(?=#|[a-zA-Z])/g, "&amp;")
    .trim();
}

export function validateName(
  value: unknown,
  field: FieldKey,
  options: { required?: boolean; maxLength?: number } = {}
): string | undefined {
  const { required = false, maxLength = getValidationConfig().name.defaultMaxLength } = options;

  const validated = validateString(value, field, {
    required,
    minLength: 1,
    maxLength,
  });

  if (validated === undefined) return undefined;

  return sanitizeString(validated);
}

export function validateTime(
  value: unknown,
  field: FieldKey,
  options: { required?: boolean } = {}
): string | undefined {
  return validateString(value, field, {
    ...options,
    pattern: /^([01]\d|2[0-3]):[0-5]\d$/,
    patternMessage: messageRef("validation.time"),
    maxLength: 5,
  });
}

export function validateColor(
  value: unknown,
  field: FieldKey,
  options: { required?: boolean } = {}
): string | undefined {
  const defaultColor = getValidationConfig().shift.defaultColor;

  return validateString(value, field, {
    ...options,
    pattern: /^#[0-9a-fA-F]{6}$/,
    patternMessage: messageRef("validation.color", { example: defaultColor }),
    maxLength: 7,
  });
}
