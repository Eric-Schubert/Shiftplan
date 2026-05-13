import { ContactService } from "~/server/services/contact.service";
import { ContactMailService } from "~/server/services/contact-mail.service";
import { getClientIP } from "~/server/utils/session";
import { sanitizeString, validateString } from "~/server/utils/validation";
import { getContactFormConfig, getContactRateLimitConfig } from "~/server/config/contact-config";

type ContactRequestBody = {
  name?: unknown;
  replyTo?: unknown;
  subject?: unknown;
  message?: unknown;
  company?: unknown;
};

type ContactRateLimit = {
  count: number;
  firstAttempt: number;
};

const contactRateLimits = new Map<string, ContactRateLimit>();

function cleanupRateLimits(now: number): void {
  const rateLimit = getContactRateLimitConfig();
  for (const [key, record] of contactRateLimits) {
    if (now - record.firstAttempt > rateLimit.windowMs) {
      contactRateLimits.delete(key);
    }
  }
}

function assertRateLimit(ip: string): void {
  const now = Date.now();
  cleanupRateLimits(now);
  const rateLimit = getContactRateLimitConfig();

  const record = contactRateLimits.get(ip);
  if (!record || now - record.firstAttempt > rateLimit.windowMs) {
    contactRateLimits.set(ip, { count: 1, firstAttempt: now });
    return;
  }

  if (record.count >= rateLimit.maxMessages) {
    throw createError({
      statusCode: 429,
      statusMessage: "Zu viele Kontaktanfragen. Bitte später erneut versuchen.",
    });
  }

  record.count += 1;
}

function cleanText(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return sanitizeString(value);
}

export default defineEventHandler(async (event) => {
  const body = (await readBody<ContactRequestBody>(event).catch(() => ({}))) as ContactRequestBody;

  if (typeof body.company === "string" && body.company.trim().length > 0) {
    return { success: true };
  }

  const ip = getClientIP(event);
  assertRateLimit(ip);
  const formConfig = getContactFormConfig();

  const name = cleanText(
    validateString(body.name, "Name", {
      required: true,
      minLength: formConfig.name.minLength,
      maxLength: formConfig.name.maxLength,
    })
  )!;
  const replyTo = cleanText(
    validateString(body.replyTo, "Rückkontakt", {
      required: true,
      minLength: formConfig.replyTo.minLength,
      maxLength: formConfig.replyTo.maxLength,
    })
  )!;
  const subject = cleanText(
    validateString(body.subject, "Betreff", {
      required: false,
      minLength: formConfig.subject.minLength,
      maxLength: formConfig.subject.maxLength,
    })
  );
  const message = cleanText(
    validateString(body.message, "Nachricht", {
      required: true,
      minLength: formConfig.message.minLength,
      maxLength: formConfig.message.maxLength,
    })
  )!;

  const savedMessage = ContactService.createMessage({
    name,
    replyTo,
    subject,
    message,
    ip,
    userAgent: getHeader(event, "user-agent") || "",
  });

  await ContactMailService.sendMessageNotification(savedMessage).catch((error) => {
    console.error("[contact] E-Mail-Benachrichtigung konnte nicht versendet werden", error);
  });

  return { success: true };
});
