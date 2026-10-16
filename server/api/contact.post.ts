import type { H3Event } from "h3";
import { ContactService } from "~/server/services/contact.service";
import { ContactMailService } from "~/server/services/contact-mail.service";
import { getClientIP } from "~/server/utils/session";
import { validateString } from "~/server/utils/validation";
import { getContactFormConfig, getContactRateLimitConfig } from "~/server/config/contact-config";
import { apiError } from "~/server/utils/api-error";
import { readObjectBody } from "~/server/utils/json-body";

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

function assertRateLimit(event: H3Event, ip: string): void {
  const now = Date.now();
  cleanupRateLimits(now);
  const rateLimit = getContactRateLimitConfig();

  const record = contactRateLimits.get(ip);
  if (!record || now - record.firstAttempt > rateLimit.windowMs) {
    contactRateLimits.set(ip, { count: 1, firstAttempt: now });
    return;
  }

  if (record.count >= rateLimit.maxMessages) {
    throw apiError(event, 429, "errors.contact.tooMany");
  }

  record.count += 1;
}

export default defineEventHandler(async (event) => {
  const body = await readObjectBody<ContactRequestBody>(event);

  if (typeof body.company === "string" && body.company.trim().length > 0) {
    return { success: true };
  }

  const ip = getClientIP(event);
  assertRateLimit(event, ip);
  const formConfig = getContactFormConfig();

  // Stored as typed (trimmed): the admin view escapes on render and the mail is plain text.
  const name = validateString(body.name, "name", {
    required: true,
    minLength: formConfig.name.minLength,
    maxLength: formConfig.name.maxLength,
  });
  const replyTo = validateString(body.replyTo, "replyTo", {
    required: true,
    minLength: formConfig.replyTo.minLength,
    maxLength: formConfig.replyTo.maxLength,
  });
  const subject = validateString(body.subject, "subject", {
    required: false,
    minLength: formConfig.subject.minLength,
    maxLength: formConfig.subject.maxLength,
  });
  const message = validateString(body.message, "message", {
    required: true,
    minLength: formConfig.message.minLength,
    maxLength: formConfig.message.maxLength,
  });

  const savedMessage = ContactService.createMessage({
    name,
    replyTo,
    subject,
    message,
    ip,
    userAgent: getHeader(event, "user-agent") || "",
  });

  await ContactMailService.sendMessageNotification(savedMessage).catch((error) => {
    console.error("[contact] Email notification could not be sent", error);
  });

  return { success: true };
});
