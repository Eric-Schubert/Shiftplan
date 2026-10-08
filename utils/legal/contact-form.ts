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

export const MIN_MESSAGE_LENGTH = 10;

export const CONTACT_FIELD_IDS: Record<keyof ContactValidation, string> = {
  name: "contact-name",
  replyTo: "contact-reply-to",
  subject: "contact-subject",
  message: "contact-message",
};

export function validateContactForm(form: ContactForm): ContactValidation {
  const validation: ContactValidation = {};
  const name = form.name.trim();
  const replyTo = form.replyTo.trim();
  const subject = form.subject.trim();
  const message = form.message.trim();

  if (!name) {
    validation.name = "Bitte gib deinen Namen ein.";
  } else if (name.length < 2) {
    validation.name = "Der Name braucht mindestens 2 Zeichen.";
  }

  if (!replyTo) {
    validation.replyTo = "Bitte gib eine E-Mail-Adresse oder Telefonnummer an.";
  } else if (replyTo.length < 5) {
    validation.replyTo = "Der Rückkontakt ist zu kurz.";
  }

  if (subject && subject.length < 2) {
    validation.subject = "Der Betreff braucht mindestens 2 Zeichen.";
  }

  if (!message) {
    validation.message = "Bitte gib eine Nachricht ein.";
  } else if (message.length < MIN_MESSAGE_LENGTH) {
    validation.message = `Die Nachricht braucht mindestens ${MIN_MESSAGE_LENGTH} Zeichen.`;
  }

  return validation;
}
