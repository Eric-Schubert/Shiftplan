// Input rules that the web forms check first and the server enforces. The messages are UI text.

export const PIN_MIN_LENGTH = 6;
export const PIN_MAX_LENGTH = 12;
export const PIN_LENGTH_MESSAGE = `Die PIN braucht ${PIN_MIN_LENGTH} bis ${PIN_MAX_LENGTH} Ziffern`;
export const WEAK_PIN_MESSAGE = "Diese PIN ist zu leicht zu erraten";

const PIN_PATTERN = new RegExp(`^\\d{${PIN_MIN_LENGTH},${PIN_MAX_LENGTH}}$`);

export function isValidPin(pin: unknown): pin is string {
  return typeof pin === "string" && PIN_PATTERN.test(pin);
}

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

/** The checks of auth.passwordPolicy in backend.config.json, without the hint text. */
export type PasswordRules = {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
};

/** The first rule the password breaks, or valid with an empty message. */
export function validatePasswordStrength(
  password: string,
  policy: PasswordRules
): {
  valid: boolean;
  message: string;
} {
  if (password.length < policy.minLength) {
    return { valid: false, message: `Passwort muss mindestens ${policy.minLength} Zeichen haben` };
  }
  if (password.length > policy.maxLength) {
    return { valid: false, message: `Passwort darf maximal ${policy.maxLength} Zeichen haben` };
  }
  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    return { valid: false, message: "Passwort muss mindestens einen Großbuchstaben enthalten" };
  }
  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    return { valid: false, message: "Passwort muss mindestens einen Kleinbuchstaben enthalten" };
  }
  if (policy.requireNumber && !/[0-9]/.test(password)) {
    return { valid: false, message: "Passwort muss mindestens eine Zahl enthalten" };
  }
  return { valid: true, message: "" };
}
