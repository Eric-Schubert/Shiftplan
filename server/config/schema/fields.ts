export type MutableErrorList = string[];

export function objectAt(value: unknown, path: string, errors: MutableErrorList): Record<string, any> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    errors.push(`${path} muss ein Objekt sein`);
    return {};
  }
  return value as Record<string, any>;
}

export function stringAt(value: unknown, path: string, errors: MutableErrorList): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(`${path} muss ein nicht-leerer String sein`);
    return "";
  }
  return value;
}

export function stringArrayAt(
  value: unknown,
  path: string,
  errors: MutableErrorList,
  options: { minLength?: number } = {}
): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    errors.push(`${path} muss eine String-Liste sein`);
    return [];
  }
  if (options.minLength && value.length < options.minLength) {
    errors.push(`${path} muss mindestens ${options.minLength} Eintrag enthalten`);
  }
  return value;
}

export function booleanAt(value: unknown, path: string, errors: MutableErrorList): boolean {
  if (typeof value !== "boolean") {
    errors.push(`${path} muss true oder false sein`);
    return false;
  }
  return value;
}

export function integerAt(
  value: unknown,
  path: string,
  errors: MutableErrorList,
  options: { min?: number; max?: number } = {}
): number {
  if (!Number.isInteger(value)) {
    errors.push(`${path} muss eine ganze Zahl sein`);
    return 0;
  }
  const numberValue = value as number;
  if (options.min !== undefined && numberValue < options.min) {
    errors.push(`${path} darf nicht kleiner als ${options.min} sein`);
  }
  if (options.max !== undefined && numberValue > options.max) {
    errors.push(`${path} darf nicht groesser als ${options.max} sein`);
  }
  return numberValue;
}

export function oneOf(
  value: unknown,
  path: string,
  allowed: Set<string>,
  errors: MutableErrorList
): void {
  if (typeof value !== "string" || !allowed.has(value)) {
    errors.push(`${path} muss einer dieser Werte sein: ${Array.from(allowed).join(", ")}`);
  }
}

export function validateTimeZone(value: unknown, path: string, errors: MutableErrorList): void {
  if (typeof value !== "string") return;
  try {
    new Intl.DateTimeFormat("de-DE", { timeZone: value }).format(new Date());
  } catch {
    errors.push(`${path} ist keine gueltige IANA-Zeitzone`);
  }
}
