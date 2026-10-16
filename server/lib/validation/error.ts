import type validation from "~/i18n/locales/de/validation";
import { apiError, messageRef, type ErrorParams, type MessageRef } from "~/server/utils/api-error";

export type FieldKey = keyof typeof validation.fields;
export type ValidationRule = Exclude<keyof typeof validation, "fields">;

/** The label of an input field, for the `{field}` of a message. */
export function fieldLabel(field: FieldKey): MessageRef {
  return messageRef(`validation.fields.${field}`);
}

export function createValidationError(rule: ValidationRule, field: FieldKey, params: ErrorParams = {}) {
  return apiError(null, 400, `validation.${rule}`, { field: fieldLabel(field), ...params });
}
