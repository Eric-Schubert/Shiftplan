export type MutableErrorList = string[];

export function objectAt(value: unknown, path: string, errors: MutableErrorList): Record<string, any> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    errors.push(`${path} must be an object`);
    return {};
  }
  return value as Record<string, any>;
}

export function stringAt(value: unknown, path: string, errors: MutableErrorList): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(`${path} must be a non-empty string`);
    return "";
  }
  return value;
}

export function stringArrayAt(value: unknown, path: string, errors: MutableErrorList, options: { minLength?: number } = {}): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    errors.push(`${path} must be a list of strings`);
    return [];
  }
  if (options.minLength && value.length < options.minLength) {
    errors.push(`${path} must have at least ${options.minLength} entries`);
  }
  return value;
}

export function booleanAt(value: unknown, path: string, errors: MutableErrorList): boolean {
  if (typeof value !== "boolean") {
    errors.push(`${path} must be true or false`);
    return false;
  }
  return value;
}

export function integerAt(value: unknown, path: string, errors: MutableErrorList, options: { min?: number; max?: number } = {}): number {
  if (!Number.isInteger(value)) {
    errors.push(`${path} must be an integer`);
    return 0;
  }
  const numberValue = value as number;
  if (options.min !== undefined && numberValue < options.min) {
    errors.push(`${path} must not be less than ${options.min}`);
  }
  if (options.max !== undefined && numberValue > options.max) {
    errors.push(`${path} must not be greater than ${options.max}`);
  }
  return numberValue;
}

export function oneOf(value: unknown, path: string, allowed: Set<string>, errors: MutableErrorList): void {
  if (typeof value !== "string" || !allowed.has(value)) {
    errors.push(`${path} must be one of: ${Array.from(allowed).join(", ")}`);
  }
}

export function validateTimeZone(value: unknown, path: string, errors: MutableErrorList): void {
  if (typeof value !== "string") return;
  try {
    new Intl.DateTimeFormat("de-DE", { timeZone: value }).format(new Date());
  } catch {
    errors.push(`${path} is not a valid IANA time zone`);
  }
}
