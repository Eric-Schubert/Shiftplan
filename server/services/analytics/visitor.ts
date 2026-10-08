import { createHmac, randomBytes } from "node:crypto";
import { getAdminDatabase } from "~/server/utils/database";
import { getAnalyticsConfig } from "~/server/config/analytics-config";

const ANALYTICS_SALT_KEY = "analytics_salt";

function getAnalyticsSalt(): string {
  const db = getAdminDatabase();
  const existing = db
    .prepare("SELECT value FROM settings WHERE key = ?")
    .get(ANALYTICS_SALT_KEY) as { value: string } | undefined;

  if (existing?.value) return existing.value;

  const salt = randomBytes(32).toString("hex");
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(
    ANALYTICS_SALT_KEY,
    salt
  );
  return salt;
}

export function hashDailyVisitor(date: string, ip: string, userAgent: string): string {
  return createHmac("sha256", getAnalyticsSalt())
    .update(date)
    .update("\n")
    .update(ip || "unknown")
    .update("\n")
    .update(userAgent || "unknown")
    .digest("hex");
}

export function normalizeText(value: string | null | undefined, maxLength: number): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

export function normalizePath(path: string): string {
  const cleaned = path.trim() || "/";
  return cleaned.slice(0, getAnalyticsConfig().text.pathMaxLength);
}

export function normalizeReferrer(referrer: string | null | undefined): string | null {
  const textConfig = getAnalyticsConfig().text;
  const value = normalizeText(referrer, textConfig.referrerMaxLength);
  if (!value) return null;

  try {
    const url = new URL(value);
    return normalizeText(url.hostname, textConfig.referrerHostMaxLength);
  } catch {
    return null;
  }
}

export function normalizeCountryCode(value: string | null | undefined): string | null {
  const normalized = normalizeText(value, getAnalyticsConfig().text.countryCodeMaxLength)?.toUpperCase() || null;
  if (!normalized || normalized === "XX" || normalized === "ZZ") return null;
  return normalized;
}
