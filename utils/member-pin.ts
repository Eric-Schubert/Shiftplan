export const WEAK_PIN_MESSAGE = "Diese PIN ist zu leicht zu erraten";

/** PINs anyone tries first: one digit repeated, straight runs and a short block repeated. */
export function isWeakPin(pin: string): boolean {
  const digits = [...pin].map(Number);
  const steps = new Set(digits.slice(1).map((digit, index) => digit - digits[index]!));
  if (steps.size === 1 && [0, 1, -1].includes([...steps][0]!)) return true;

  for (let size = 1; size <= Math.min(3, pin.length / 2); size += 1) {
    if (pin.length % size === 0 && pin === pin.slice(0, size).repeat(pin.length / size)) return true;
  }
  return false;
}

/** Checks a new PIN typed twice; returns an error text or null. */
export function pinProblem(pin: string, repeat: string): string | null {
  if (!/^\d{6,12}$/.test(pin)) return "Die PIN braucht 6 bis 12 Ziffern";
  if (isWeakPin(pin)) return WEAK_PIN_MESSAGE;
  if (pin !== repeat) return "Die PINs stimmen nicht überein";
  return null;
}
