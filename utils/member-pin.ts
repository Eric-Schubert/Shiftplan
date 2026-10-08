/** Checks a new PIN typed twice; returns an error text or null. */
export function pinProblem(pin: string, repeat: string): string | null {
  if (!/^\d{6,12}$/.test(pin)) return "Die PIN braucht 6 bis 12 Ziffern";
  if (pin !== repeat) return "Die PINs stimmen nicht überein";
  return null;
}
