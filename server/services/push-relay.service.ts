import { getAdminDatabase } from "~/server/utils/database";

const DEFAULT_RELAY_URL = "https://push.shiftplan.info";
const RELAY_ID_SETTING = "relay_instance_id";
const RELAY_SECRET_SETTING = "relay_secret";
const RELAY_URL_SETTING = "relay_url";
const MAX_TOKENS_PER_REQUEST = 500;
const REQUEST_TIMEOUT_MS = 10_000;

export type NativeMessage = {
  title: string;
  body: string;
  data: Record<string, string>;
  tokens: string[];
};

export type RelayResult = { sent: number; failed: number; invalidTokens: string[] };

class RelayUnauthorizedError extends Error {}

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

function clearCredentials(): void {
  getAdminDatabase()
    .prepare("DELETE FROM settings WHERE key IN (?, ?, ?)")
    .run(RELAY_ID_SETTING, RELAY_SECRET_SETTING, RELAY_URL_SETTING);
}

/** `SHIFTPLAN_PUSH_RELAY_URL=off` (or empty) disables app pushes entirely. */
export function getRelayUrl(): string | null {
  const configured = process.env.SHIFTPLAN_PUSH_RELAY_URL;
  if (configured === undefined) return DEFAULT_RELAY_URL;
  const value = configured.trim();
  if (!value || value === "off") return null;
  return value.replace(/\/+$/, "");
}

async function relayFetch(url: string, init: RequestInit): Promise<any> {
  const response = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", ...init.headers },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (response.status === 401) throw new RelayUnauthorizedError("Relay rejected credentials");
  if (!response.ok) {
    throw new Error(`Relay responded with ${response.status}`);
  }
  return response.json();
}

export const PushRelayService = {
  /**
   * Registers this instance on first use. A changed relay URL or credentials the
   * relay no longer knows lead to a fresh registration.
   */
  async credentials(
    relayUrl: string,
    instance: { name: string; url: string | null }
  ): Promise<string> {
    const id = getSetting(RELAY_ID_SETTING);
    const secret = getSetting(RELAY_SECRET_SETTING);
    if (id && secret && getSetting(RELAY_URL_SETTING) === relayUrl) return `${id}.${secret}`;

    const registered = await relayFetch(`${relayUrl}/v1/instances`, {
      method: "POST",
      body: JSON.stringify(instance),
    });
    setSetting(RELAY_ID_SETTING, registered.instanceId);
    setSetting(RELAY_SECRET_SETTING, registered.secret);
    setSetting(RELAY_URL_SETTING, relayUrl);
    return `${registered.instanceId}.${registered.secret}`;
  },

  async send(
    messages: NativeMessage[],
    instance: { name: string; url: string | null }
  ): Promise<RelayResult> {
    const result: RelayResult = { sent: 0, failed: 0, invalidTokens: [] };
    const relayUrl = getRelayUrl();
    const total = messages.reduce((sum, message) => sum + message.tokens.length, 0);
    if (!relayUrl || total === 0) return result;

    let credential: string;
    try {
      credential = await this.credentials(relayUrl, instance);
    } catch (error) {
      console.error("[push] Relay-Registrierung fehlgeschlagen:", (error as Error).message);
      return { ...result, failed: total };
    }

    for (const message of messages) {
      for (let index = 0; index < message.tokens.length; index += MAX_TOKENS_PER_REQUEST) {
        const tokens = message.tokens.slice(index, index + MAX_TOKENS_PER_REQUEST);
        const request = (auth: string) =>
          relayFetch(`${relayUrl}/v1/send`, {
            method: "POST",
            headers: { authorization: `Bearer ${auth}` },
            body: JSON.stringify({
              tokens,
              notification: { title: message.title, body: message.body },
              data: message.data,
            }),
          });

        try {
          let response;
          try {
            response = await request(credential);
          } catch (error) {
            if (!(error instanceof RelayUnauthorizedError)) throw error;
            clearCredentials();
            credential = await this.credentials(relayUrl, instance);
            response = await request(credential);
          }
          result.sent += response.sent;
          result.failed += response.failed;
          result.invalidTokens.push(...response.invalidTokens);
        } catch (error) {
          console.error("[push] Relay-Versand fehlgeschlagen:", (error as Error).message);
          result.failed += tokens.length;
        }
      }
    }

    return result;
  },
};
