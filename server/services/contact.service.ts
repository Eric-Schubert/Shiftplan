import { createHmac, randomBytes } from "node:crypto";
import { getAdminDatabase } from "~/server/utils/database";
import type { ContactMessage, ContactMessagesResponse } from "~/types/contact";

type ContactCreateInput = {
  name: string;
  replyTo: string;
  subject?: string;
  message: string;
  ip: string;
  userAgent: string;
};

const CONTACT_SALT_KEY = "contact_message_salt";
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function normalizeLimit(value?: number): number {
  if (!Number.isFinite(value)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, Math.trunc(value || DEFAULT_LIMIT)));
}

function normalizeOffset(value?: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.trunc(value || 0));
}

function normalizeStoredText(value: string | undefined, maxLength: number): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function getContactSalt(): string {
  const db = getAdminDatabase();
  const existing = db
    .prepare("SELECT value FROM settings WHERE key = ?")
    .get(CONTACT_SALT_KEY) as { value: string } | undefined;

  if (existing?.value) return existing.value;

  const salt = randomBytes(32).toString("hex");
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(
    CONTACT_SALT_KEY,
    salt
  );
  return salt;
}

function hashContactSource(ip: string, userAgent: string): string {
  return createHmac("sha256", getContactSalt())
    .update(ip || "unknown")
    .update("\n")
    .update(userAgent || "unknown")
    .digest("hex");
}

export class ContactService {
  static createMessage(params: ContactCreateInput): ContactMessage {
    const db = getAdminDatabase();
    const result = db
      .prepare(
        `
          INSERT INTO contact_messages (
            name,
            reply_to,
            subject,
            message,
            ip_hash,
            user_agent,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        `
      )
      .run(
        params.name,
        params.replyTo,
        normalizeStoredText(params.subject, 160),
        params.message,
        hashContactSource(params.ip, params.userAgent),
        normalizeStoredText(params.userAgent, 280)
      );

    return this.getMessage(Number(result.lastInsertRowid));
  }

  static getMessage(contactId: number): ContactMessage {
    const message = getAdminDatabase()
      .prepare(
        `
          SELECT contact_id, name, reply_to, subject, message, created_at, read_at
          FROM contact_messages
          WHERE contact_id = ?
        `
      )
      .get(contactId) as ContactMessage | undefined;

    if (!message) {
      throw createError({
        statusCode: 404,
        statusMessage: "Kontaktanfrage nicht gefunden",
      });
    }

    return message;
  }

  static getMessages(options?: { limit?: number; offset?: number }): ContactMessagesResponse {
    const db = getAdminDatabase();
    const limit = normalizeLimit(options?.limit);
    const offset = normalizeOffset(options?.offset);

    const total = db
      .prepare("SELECT COUNT(*) AS count FROM contact_messages")
      .get() as { count: number };

    const messages = db
      .prepare(
        `
          SELECT contact_id, name, reply_to, subject, message, created_at, read_at
          FROM contact_messages
          ORDER BY created_at DESC, contact_id DESC
          LIMIT ? OFFSET ?
        `
      )
      .all(limit, offset) as ContactMessage[];

    return { messages, total: total.count };
  }

  static markRead(contactId: number): ContactMessage {
    getAdminDatabase()
      .prepare(
        `
          UPDATE contact_messages
          SET read_at = COALESCE(read_at, datetime('now'))
          WHERE contact_id = ?
        `
      )
      .run(contactId);

    return this.getMessage(contactId);
  }
}
