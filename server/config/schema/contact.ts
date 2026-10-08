import {
  booleanAt,
  integerAt,
  objectAt,
  oneOf,
  stringAt,
  validateTimeZone,
  type MutableErrorList,
} from "./fields";
import { rangeOrder, validateLength } from "./ranges";

export function validateContact(value: unknown, errors: MutableErrorList): void {
  const config = objectAt(value, "contact", errors);
  const rateLimit = objectAt(config.rateLimit, "contact.rateLimit", errors);
  integerAt(rateLimit.windowMinutes, "contact.rateLimit.windowMinutes", errors, { min: 1 });
  integerAt(rateLimit.maxMessages, "contact.rateLimit.maxMessages", errors, { min: 1 });

  const list = objectAt(config.list, "contact.list", errors);
  integerAt(list.defaultLimit, "contact.list.defaultLimit", errors, { min: 1 });
  integerAt(list.maxLimit, "contact.list.maxLimit", errors, { min: 1 });
  rangeOrder(list.defaultLimit, list.maxLimit, "contact.list", errors);

  const storage = objectAt(config.storage, "contact.storage", errors);
  integerAt(storage.subjectMaxLength, "contact.storage.subjectMaxLength", errors, { min: 1 });
  integerAt(storage.userAgentMaxLength, "contact.storage.userAgentMaxLength", errors, { min: 1 });

  const form = objectAt(config.form, "contact.form", errors);
  validateLength(form.name, "contact.form.name", errors);
  validateLength(form.replyTo, "contact.form.replyTo", errors);
  validateLength(form.subject, "contact.form.subject", errors);
  validateLength(form.message, "contact.form.message", errors);
}

export function validateContactMail(value: unknown, errors: MutableErrorList): void {
  const config = objectAt(value, "contactMail", errors);
  oneOf(config.provider, "contactMail.provider", new Set(["graph"]), errors);
  stringAt(config.subjectPrefix, "contactMail.subjectPrefix", errors);
  booleanAt(config.saveToSentItemsDefault, "contactMail.saveToSentItemsDefault", errors);
  integerAt(config.tokenSkewSeconds, "contactMail.tokenSkewSeconds", errors, { min: 0 });
  stringAt(config.graphScope, "contactMail.graphScope", errors);
  stringAt(config.dateLocale, "contactMail.dateLocale", errors);
  stringAt(config.timezone, "contactMail.timezone", errors);
  validateTimeZone(config.timezone, "contactMail.timezone", errors);
  integerAt(config.subjectMaxLength, "contactMail.subjectMaxLength", errors, { min: 1 });
  integerAt(config.errorBodyMaxLength, "contactMail.errorBodyMaxLength", errors, { min: 1 });
}
