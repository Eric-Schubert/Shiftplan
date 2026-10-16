import type { MessageRef } from "~/i18n/types";
import { PIN_MAX_LENGTH, PIN_MIN_LENGTH, isValidPin, isWeakPin } from "~/shared/utils/limits";

/** Checks a new PIN typed twice; returns the error message or null. The first two are the server's. */
export function pinProblem(pin: string, repeat: string): MessageRef | null {
  if (!isValidPin(pin)) return { key: "errors.member.pinLength", params: { min: PIN_MIN_LENGTH, max: PIN_MAX_LENGTH } };
  if (isWeakPin(pin)) return { key: "errors.member.pinWeak" };
  if (pin !== repeat) return { key: "member.pin.mismatch" };
  return null;
}
