import type { ContactMessage } from "~/types/contact";
import { getContactMailDefaults } from "~/server/config/contact-mail-config";

type ContactMailConfig = {
  provider: "graph";
  to: string[];
  tenantId: string;
  clientId: string;
  clientSecret: string;
  from: string;
  subjectPrefix: string;
  saveToSentItems: boolean;
};

type GraphTokenResponse = {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

type CachedGraphToken = {
  cacheKey: string;
  accessToken: string;
  expiresAt: number;
};

let cachedGraphToken: CachedGraphToken | null = null;

function envValue(name: string): string {
  return process.env[name]?.trim() || "";
}

function splitEmailList(value: string): string[] {
  return value
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function boolEnv(name: string, fallback: boolean): boolean {
  const value = envValue(name).toLowerCase();
  if (!value) return fallback;
  return ["1", "true", "yes", "ja", "on"].includes(value);
}

function isEmailAddress(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getContactMailConfig(): ContactMailConfig | null {
  const provider = envValue("CONTACT_MAIL_PROVIDER").toLowerCase();
  const hasGraphConfig = [
    "CONTACT_MAIL_GRAPH_TENANT_ID",
    "CONTACT_MAIL_GRAPH_CLIENT_ID",
    "CONTACT_MAIL_GRAPH_CLIENT_SECRET",
    "CONTACT_MAIL_GRAPH_FROM",
  ].some((name) => envValue(name));

  if (!provider && !hasGraphConfig) return null;

  if (provider && provider !== "graph") {
    throw new Error(`Unbekannter Kontakt-Mail-Provider: ${provider}`);
  }

  const config: ContactMailConfig = {
    provider: "graph",
    to: splitEmailList(envValue("CONTACT_MAIL_TO")),
    tenantId: envValue("CONTACT_MAIL_GRAPH_TENANT_ID"),
    clientId: envValue("CONTACT_MAIL_GRAPH_CLIENT_ID"),
    clientSecret: envValue("CONTACT_MAIL_GRAPH_CLIENT_SECRET"),
    from: envValue("CONTACT_MAIL_GRAPH_FROM"),
    subjectPrefix: envValue("CONTACT_MAIL_SUBJECT_PREFIX") || getContactMailDefaults().subjectPrefix,
    saveToSentItems: boolEnv(
      "CONTACT_MAIL_SAVE_TO_SENT_ITEMS",
      getContactMailDefaults().saveToSentItemsDefault
    ),
  };

  const missingFields = [
    ["CONTACT_MAIL_TO", config.to.length > 0],
    ["CONTACT_MAIL_GRAPH_TENANT_ID", Boolean(config.tenantId)],
    ["CONTACT_MAIL_GRAPH_CLIENT_ID", Boolean(config.clientId)],
    ["CONTACT_MAIL_GRAPH_CLIENT_SECRET", Boolean(config.clientSecret)],
    ["CONTACT_MAIL_GRAPH_FROM", Boolean(config.from)],
  ]
    .filter(([, isPresent]) => !isPresent)
    .map(([name]) => name);

  if (missingFields.length > 0) {
    throw new Error(`Kontakt-Mail ist unvollständig konfiguriert: ${missingFields.join(", ")}`);
  }

  return config;
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

function buildSubject(message: ContactMessage, subjectPrefix: string): string {
  const subject = message.subject || `Kontaktanfrage von ${message.name}`;
  return `${subjectPrefix} ${subject}`.slice(0, getContactMailDefaults().subjectMaxLength);
}

function buildMailText(message: ContactMessage): string {
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

async function readResponseText(response: Response): Promise<string> {
  return (await response.text().catch(() => "")).slice(
    0,
    getContactMailDefaults().errorBodyMaxLength
  );
}

async function getGraphAccessToken(config: ContactMailConfig): Promise<string> {
  const cacheKey = `${config.tenantId}:${config.clientId}`;
  const now = Date.now();
  if (
    cachedGraphToken?.cacheKey === cacheKey &&
    cachedGraphToken.expiresAt - getContactMailDefaults().tokenSkewSeconds * 1000 > now
  ) {
    return cachedGraphToken.accessToken;
  }

  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "client_credentials",
    scope: getContactMailDefaults().graphScope,
  });

  const response = await fetch(
    `https://login.microsoftonline.com/${encodeURIComponent(config.tenantId)}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body,
    }
  );

  const tokenResponse = (await response.json().catch(() => ({}))) as GraphTokenResponse;
  if (!response.ok || !tokenResponse.access_token) {
    throw new Error(
      `Microsoft Graph Token konnte nicht geholt werden (${response.status}): ${
        tokenResponse.error_description || tokenResponse.error || "Unbekannter Fehler"
      }`
    );
  }

  cachedGraphToken = {
    cacheKey,
    accessToken: tokenResponse.access_token,
    expiresAt: now + (tokenResponse.expires_in || 3600) * 1000,
  };

  return tokenResponse.access_token;
}

async function sendGraphMail(config: ContactMailConfig, message: ContactMessage): Promise<void> {
  const accessToken = await getGraphAccessToken(config);
  const replyAddress = isEmailAddress(message.reply_to) ? message.reply_to : null;
  const payload = {
    message: {
      subject: buildSubject(message, config.subjectPrefix),
      body: {
        contentType: "Text",
        content: buildMailText(message),
      },
      toRecipients: config.to.map((address) => ({
        emailAddress: { address },
      })),
      ...(replyAddress
        ? {
            replyTo: [
              {
                emailAddress: {
                  address: replyAddress,
                  name: message.name,
                },
              },
            ],
          }
        : {}),
    },
    saveToSentItems: config.saveToSentItems,
  };

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(config.from)}/sendMail`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Microsoft Graph sendMail ist fehlgeschlagen (${response.status}): ${await readResponseText(
        response
      )}`
    );
  }
}

export class ContactMailService {
  static async sendMessageNotification(message: ContactMessage): Promise<void> {
    const config = getContactMailConfig();
    if (!config) return;

    await sendGraphMail(config, message);
  }
}

export function resetContactMailTokenCacheForTests(): void {
  cachedGraphToken = null;
}
