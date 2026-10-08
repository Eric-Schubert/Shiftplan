import { integerAt, objectAt, type MutableErrorList } from "./fields";

export function rangeOrder(min: unknown, max: unknown, path: string, errors: MutableErrorList): void {
  if (typeof min === "number" && typeof max === "number" && min > max) {
    errors.push(`${path}.min darf nicht groesser als ${path}.max sein`);
  }
}

export function validateRange(value: unknown, path: string, errors: MutableErrorList): void {
  const range = objectAt(value, path, errors);
  integerAt(range.min, `${path}.min`, errors);
  integerAt(range.max, `${path}.max`, errors);
  rangeOrder(range.min, range.max, path, errors);
}

export function validateDefaultRange(value: unknown, path: string, errors: MutableErrorList): void {
  const range = objectAt(value, path, errors);
  validateRange(range, path, errors);
  integerAt(range.default, `${path}.default`, errors);
  if (
    typeof range.default === "number" &&
    typeof range.min === "number" &&
    typeof range.max === "number" &&
    (range.default < range.min || range.default > range.max)
  ) {
    errors.push(`${path}.default muss zwischen min und max liegen`);
  }
}

export function validateLength(value: unknown, path: string, errors: MutableErrorList): void {
  const range = objectAt(value, path, errors);
  integerAt(range.minLength, `${path}.minLength`, errors, { min: 0 });
  integerAt(range.maxLength, `${path}.maxLength`, errors, { min: 1 });
  rangeOrder(range.minLength, range.maxLength, path, errors);
}
