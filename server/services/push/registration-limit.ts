// New push targets without a personal sign-in share instance-wide caps (subscriptions, team devices).
// A browser or app registers once and renews the same target later, so a few dozen new targets an hour per
// network leave room for a whole office behind one address, but one client cannot fill the caps for everyone.
const WINDOW_MS = 60 * 60 * 1000;
const MAX_NEW_TARGETS_PER_WINDOW = 30;
const windows = new Map<string, { start: number; count: number }>();

/** Whether this network may register one more new push target in the current hour; counts it if so. */
export function allowNewTarget(network: string, now = Date.now()): boolean {
  for (const [key, entry] of windows) {
    if (now - entry.start >= WINDOW_MS) windows.delete(key);
  }

  const entry = windows.get(network);
  if (!entry) {
    windows.set(network, { start: now, count: 1 });
    return true;
  }
  if (entry.count >= MAX_NEW_TARGETS_PER_WINDOW) return false;
  entry.count++;
  return true;
}
