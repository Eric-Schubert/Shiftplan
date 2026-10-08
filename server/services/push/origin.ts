let lastOrigin: string | null = null;

/** Origin of the last plan change, remembered for the VAPID subject and the relay. */
export function rememberOrigin(origin: string): void {
  lastOrigin = origin;
}

export function getHttpsOrigin(): string | null {
  return lastOrigin?.startsWith("https://") ? lastOrigin : null;
}
