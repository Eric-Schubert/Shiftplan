import type { ContactMessage } from "~/types/contact";
import { localeTag } from "~/i18n/config";
import { t } from "~/i18n/server";
import { getContactMailDefaults } from "~/server/config/contact-mail-config";
import { instanceLocale } from "~/server/utils/locale";
import { formatTimestamp } from "~/shared/utils/format/time";

const EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

export function isEmailAddress(value: string): boolean {
  return EMAIL_PATTERN.test(value);
}

/** The reply-to address in "a@b.de" or "Name <a@b.de>"; null for a phone number or anything else. */
export function getReplyAddress(replyTo: string): string | null {
  const value = replyTo.trim();
  if (isEmailAddress(value)) return value;
  const bracketed = /<([^<>]+)>$/.exec(value)?.[1]?.trim();
  return bracketed && isEmailAddress(bracketed) ? bracketed : null;
}

function formatMessageDate(value: string, locale: string): string {
  const date = new Date(value.endsWith("Z") ? value : `${value}Z`);
  if (Number.isNaN(date.getTime())) return value;

  return formatTimestamp(localeTag(locale), date, getContactMailDefaults().timezone);
}

// The mail goes to the operator, so it is written in the instance's language, not the visitor's.
export function buildSubject(message: ContactMessage, subjectPrefix: string, locale = instanceLocale()): string {
  const subject = message.subject || t(locale, "mail.contact.subject", { name: message.name });
  return `${subjectPrefix} ${subject}`.slice(0, getContactMailDefaults().subjectMaxLength);
}

export function buildMailText(message: ContactMessage, locale = instanceLocale()): string {
  return [
    t(locale, "mail.contact.heading"),
    "",
    t(locale, "mail.contact.id", { id: message.contact_id }),
    t(locale, "mail.contact.received", { date: formatMessageDate(message.created_at, locale) }),
    t(locale, "mail.contact.name", { name: message.name }),
    t(locale, "mail.contact.replyTo", { replyTo: message.reply_to }),
    t(locale, "mail.contact.subjectLine", { subject: message.subject || "-" }),
    "",
    t(locale, "mail.contact.message"),
    message.message,
  ].join("\n");
}
