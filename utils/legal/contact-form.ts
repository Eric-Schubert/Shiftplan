import type { ClientConfig } from "~/types/instance";

export type ContactForm = {
  name: string;
  replyTo: string;
  subject: string;
  message: string;
  company: string;
};

export type ContactValidation = {
  name?: string;
  replyTo?: string;
  subject?: string;
  message?: string;
};

export const CONTACT_FIELD_IDS: Record<keyof ContactValidation, string> = {
  name: "contact-name",
  replyTo: "contact-reply-to",
  subject: "contact-subject",
  message: "contact-message",
};

/** Checks the minimum lengths of contact.form in backend.config.json; the server checks them again. */
export function validateContactForm(form: ContactForm, limits: ClientConfig["contactForm"]): ContactValidation {
  const validation: ContactValidation = {};
  const name = form.name.trim();
  const replyTo = form.replyTo.trim();
  const subject = form.subject.trim();
  const message = form.message.trim();

  if (!name) {
    validation.name = "Bitte gib deinen Namen ein.";
  } else if (name.length < limits.name.minLength) {
    validation.name = `Der Name braucht mindestens ${limits.name.minLength} Zeichen.`;
  }

  if (!replyTo) {
    validation.replyTo = "Bitte gib eine E-Mail-Adresse oder Telefonnummer an.";
  } else if (replyTo.length < limits.replyTo.minLength) {
    validation.replyTo = "Der Rückkontakt ist zu kurz.";
  }

  if (subject && subject.length < limits.subject.minLength) {
    validation.subject = `Der Betreff braucht mindestens ${limits.subject.minLength} Zeichen.`;
  }

  if (!message) {
    validation.message = "Bitte gib eine Nachricht ein.";
  } else if (message.length < limits.message.minLength) {
    validation.message = `Die Nachricht braucht mindestens ${limits.message.minLength} Zeichen.`;
  }

  return validation;
}
