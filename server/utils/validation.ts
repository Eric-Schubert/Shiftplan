


import { getValidationConfig } from "~/server/config/domain-config";


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


function createValidationError(message: string) {
  return createError({
    statusCode: 400,
    statusMessage: message,
  });
}
