import { ContactService } from "~/server/services/contact.service";
import { ContactMailService } from "~/server/services/contact-mail.service";
import { getClientIP } from "~/server/utils/session";
import { sanitizeString, validateString } from "~/server/utils/validation";

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

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_MESSAGES = 5;
const contactRateLimits = new Map<string, ContactRateLimit>();

function cleanupRateLimits(now: number): void {
  for (const [key, record] of contactRateLimits) {
    if (now - record.firstAttempt > RATE_LIMIT_WINDOW_MS) {
      contactRateLimits.delete(key);
    }
  }
}

function assertRateLimit(ip: string): void {
  const now = Date.now();
  cleanupRateLimits(now);

  const record = contactRateLimits.get(ip);
  if (!record || now - record.firstAttempt > RATE_LIMIT_WINDOW_MS) {
    contactRateLimits.set(ip, { count: 1, firstAttempt: now });
    return;
  }

  if (record.count >= RATE_LIMIT_MAX_MESSAGES) {
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

  const name = cleanText(
    validateString(body.name, "Name", { required: true, minLength: 2, maxLength: 120 })
  )!;
  const replyTo = cleanText(
    validateString(body.replyTo, "Rückkontakt", {
      required: true,
      minLength: 5,
      maxLength: 180,
    })
  )!;
  const subject = cleanText(
    validateString(body.subject, "Betreff", { required: false, minLength: 2, maxLength: 160 })
  );
  const message = cleanText(
    validateString(body.message, "Nachricht", {
      required: true,
      minLength: 10,
      maxLength: 4000,
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
