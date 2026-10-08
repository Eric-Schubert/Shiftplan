import { getValidationConfig } from "~/server/config/domain-config";
import { createValidationError } from "./error";

export function validateString(
  value: unknown,
  fieldName: string,
  options: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    patternMessage?: string;
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
      throw createValidationError(`${fieldName} ist erforderlich`);
    }
    return undefined;
  }

  if (typeof value !== "string") {
    throw createValidationError(`${fieldName} muss ein Text sein`);
  }

  const trimmed = value.trim();

  if (trimmed.length === 0 && required) {
    throw createValidationError(`${fieldName} darf nicht leer sein`);
  }

  if (trimmed.length === 0) {
    return undefined;
  }

  if (trimmed.length < minLength) {
    throw createValidationError(
      `${fieldName} muss mindestens ${minLength} Zeichen haben`
    );
  }

  if (trimmed.length > maxLength) {
    throw createValidationError(
      `${fieldName} darf maximal ${maxLength} Zeichen haben`
    );
  }

  if (options.pattern && !options.pattern.test(trimmed)) {
    throw createValidationError(
      options.patternMessage || `${fieldName} hat ein ungültiges Format`
    );
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
  fieldName: string,
  options: { required?: boolean; maxLength?: number } = {}
): string | undefined {
  const { required = false, maxLength = getValidationConfig().name.defaultMaxLength } = options;

  const validated = validateString(value, fieldName, {
    required,
    minLength: 1,
    maxLength,
  });

  if (validated === undefined) return undefined;

  return sanitizeString(validated);
}

export function validateTime(
  value: unknown,
  fieldName: string,
  options: { required?: boolean } = {}
): string | undefined {
  return validateString(value, fieldName, {
    ...options,
    pattern: /^([01]\d|2[0-3]):[0-5]\d$/,
    patternMessage: `${fieldName} muss im Format HH:MM sein (z.B. 08:00)`,
    maxLength: 5,
  });
}

export function validateColor(
  value: unknown,
  fieldName: string,
  options: { required?: boolean } = {}
): string | undefined {
  const defaultColor = getValidationConfig().shift.defaultColor;

  return validateString(value, fieldName, {
    ...options,
    pattern: /^#[0-9a-fA-F]{6}$/,
    patternMessage: `${fieldName} muss ein Hex-Farbwert sein (z.B. ${defaultColor})`,
    maxLength: 7,
  });
}
