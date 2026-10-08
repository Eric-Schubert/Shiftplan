import webpush from "web-push";
import { getAdminDatabase } from "~/server/utils/database";
import { getHttpsOrigin } from "~/server/services/push/origin";

const VAPID_PUBLIC_SETTING = "vapid_public_key";
const VAPID_PRIVATE_SETTING = "vapid_private_key";

function getSetting(key: string): string | null {
  const row = getAdminDatabase()
    .prepare("SELECT value FROM settings WHERE key = ?")
    .get(key) as { value: string } | undefined;
  return row?.value || null;
}

function setSetting(key: string, value: string): void {
  getAdminDatabase()
    .prepare(
      "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    )
    .run(key, value);
}

function getVapidSubject(): string {
  const configured = process.env.SHIFTPLAN_PUSH_SUBJECT?.trim();
  if (configured) return configured;

  const imprintEmail = process.env.NUXT_PUBLIC_IMPRINT_PUBLIC_EMAIL?.trim();
  if (imprintEmail) return `mailto:${imprintEmail}`;

  return getHttpsOrigin() || "mailto:push@shiftplan.invalid";
}

export function getPublicKey(): string {
  const existing = getSetting(VAPID_PUBLIC_SETTING);
  if (existing && getSetting(VAPID_PRIVATE_SETTING)) return existing;

  const keys = webpush.generateVAPIDKeys();
  setSetting(VAPID_PUBLIC_SETTING, keys.publicKey);
  setSetting(VAPID_PRIVATE_SETTING, keys.privateKey);
  return keys.publicKey;
}

export function getVapidDetails() {
  return {
    subject: getVapidSubject(),
    publicKey: getPublicKey(),
    privateKey: getSetting(VAPID_PRIVATE_SETTING)!,
  };
}
