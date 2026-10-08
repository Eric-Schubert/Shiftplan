import type { ContactMessage } from "~/types/contact";
import { getContactMailDefaults } from "~/server/config/contact-mail-config";

export function isEmailAddress(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function formatMessageDate(value: string): string {
  const date = new Date(value.endsWith("Z") ? value : `${value}Z`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(getContactMailDefaults().dateLocale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: getContactMailDefaults().timezone,
  }).format(date);
}

export function buildSubject(message: ContactMessage, subjectPrefix: string): string {
  const subject = message.subject || `Kontaktanfrage von ${message.name}`;
  return `${subjectPrefix} ${subject}`.slice(0, getContactMailDefaults().subjectMaxLength);
}

export function buildMailText(message: ContactMessage): string {
  return [
    "Neue Kontaktanfrage über den Schichtplaner",
    "",
    `Kontakt-ID: ${message.contact_id}`,
    `Eingegangen: ${formatMessageDate(message.created_at)}`,
    `Name: ${message.name}`,
    `Rückkontakt: ${message.reply_to}`,
    `Betreff: ${message.subject || "-"}`,
    "",
    "Nachricht:",
    message.message,
  ].join("\n");
}
