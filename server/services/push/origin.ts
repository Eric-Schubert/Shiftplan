let lastOrigin: string | null = null;

function toOrigin(value: string): URL | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

/** A public name: no localhost, IP address or single-label host that push services reject. */
function isPublicHost(host: string): boolean {
  return (
    host.includes(".") &&
    !host.endsWith(".localhost") &&
    !host.endsWith(".local") &&
    !host.startsWith("[") &&
    !/^[\d.]+$/.test(host)
  );
}

/**
 * Origin header of a plan change. Only a fallback for instances without SHIFTPLAN_PUBLIC_URL,
 * and only plausible public https origins count, so a forged header cannot break Web Push.
 */
export function rememberOrigin(origin: string): void {
  const url = toOrigin(origin);
  if (url && isPublicHost(url.hostname)) lastOrigin = url.origin;
}

let warnedAboutConfig = false;

/** Public address of this instance for the VAPID subject and the relay. */
export function getHttpsOrigin(): string | null {
  const configured = process.env.SHIFTPLAN_PUBLIC_URL?.trim();
  if (!configured) return lastOrigin;
  const url = toOrigin(configured);
  if (url) return url.origin;
  if (!warnedAboutConfig) {
    warnedAboutConfig = true;
    console.warn(`[push] SHIFTPLAN_PUBLIC_URL ist keine https-Adresse und wird ignoriert: ${configured}`);
  }
  return lastOrigin;
}
