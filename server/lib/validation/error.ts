import type validation from "~/i18n/locales/de/validation";
import type { MessageKey } from "~/server/lib/i18n/translate";
import { apiError, messageRef, type ErrorParams } from "~/server/utils/api-error";

export type FieldKey = keyof typeof validation.fields;
export type ValidationRule = Exclude<keyof typeof validation, "fields">;

/** A 400 about one input field; the message gets the field's label as `{field}`. */
export function fieldError(key: MessageKey, field: FieldKey, params: ErrorParams = {}) {
  return apiError(null, 400, key, { field: messageRef(`validation.fields.${field}`), ...params });
}

export function createValidationError(rule: ValidationRule, field: FieldKey, params: ErrorParams = {}) {
  return fieldError(`validation.${rule}`, field, params);
}
