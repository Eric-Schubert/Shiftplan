import { PIN_LENGTH_MESSAGE, WEAK_PIN_MESSAGE, isValidPin, isWeakPin } from "~/shared/utils/limits";

/** Checks a new PIN typed twice; returns an error text or null. */
export function pinProblem(pin: string, repeat: string): string | null {
  if (!isValidPin(pin)) return PIN_LENGTH_MESSAGE;
  if (isWeakPin(pin)) return WEAK_PIN_MESSAGE;
  if (pin !== repeat) return "Die PINs stimmen nicht überein";
  return null;
}
