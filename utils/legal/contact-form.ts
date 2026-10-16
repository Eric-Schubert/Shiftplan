import type { MessageRef } from "~/i18n/types";
import type { ClientConfig } from "~/types/instance";

export type ContactForm = {
  name: string;
  replyTo: string;
  subject: string;
  message: string;
  company: string;
};

type ContactField = "name" | "replyTo" | "subject" | "message";

/** The problem of each invalid field, as a message for the caller to translate. */
export type ContactProblems = Partial<Record<ContactField, MessageRef>>;

/** The translated problems the form shows next to its fields. */
export type ContactValidation = Partial<Record<ContactField, string>>;

export const CONTACT_FIELD_IDS: Record<keyof ContactValidation, string> = {
  name: "contact-name",
  replyTo: "contact-reply-to",
  subject: "contact-subject",
  message: "contact-message",
};

/** Checks the minimum lengths of contact.form in backend.config.json; the server checks them again. */
export function validateContactForm(form: ContactForm, limits: ClientConfig["contactForm"]): ContactProblems {
  const problems: ContactProblems = {};
  const name = form.name.trim();
  const replyTo = form.replyTo.trim();
  const subject = form.subject.trim();
  const message = form.message.trim();

  if (!name) {
    problems.name = { key: "contact.form.nameMissing" };
  } else if (name.length < limits.name.minLength) {
    problems.name = { key: "contact.form.nameShort", params: { min: limits.name.minLength } };
  }

  if (!replyTo) {
    problems.replyTo = { key: "contact.form.replyToMissing" };
  } else if (replyTo.length < limits.replyTo.minLength) {
    problems.replyTo = { key: "contact.form.replyToShort" };
  }

  if (subject && subject.length < limits.subject.minLength) {
    problems.subject = { key: "contact.form.subjectShort", params: { min: limits.subject.minLength } };
  }

  if (!message) {
    problems.message = { key: "contact.form.messageMissing" };
  } else if (message.length < limits.message.minLength) {
    problems.message = { key: "contact.form.messageShort", params: { min: limits.message.minLength } };
  }

  return problems;
}
