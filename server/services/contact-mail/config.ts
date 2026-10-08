import { getContactMailDefaults } from "~/server/config/contact-mail-config";

export type ContactMailConfig = {
  provider: "graph";
  to: string[];
  tenantId: string;
  clientId: string;
  clientSecret: string;
  from: string;
  subjectPrefix: string;
  saveToSentItems: boolean;
};

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

export function getContactMailConfig(): ContactMailConfig | null {
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
