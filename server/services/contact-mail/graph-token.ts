import { getContactMailDefaults } from "~/server/config/contact-mail-config";
import type { ContactMailConfig } from "~/server/services/contact-mail/config";

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

export function resetContactMailTokenCacheForTests(): void {
  cachedGraphToken = null;
}

export async function getGraphAccessToken(config: ContactMailConfig): Promise<string> {
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
