export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 256;
export const PASSWORD_POLICY_HINT =
  "Mindestens 8 Zeichen mit Groß-/Kleinbuchstaben und Zahl";

export function validatePasswordStrength(password: string): {
  valid: boolean;
  message: string;
} {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      valid: false,
      message: `Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen haben`,
    };
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    return {
      valid: false,
      message: `Passwort darf maximal ${MAX_PASSWORD_LENGTH} Zeichen haben`,
    };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      message: "Passwort muss mindestens einen Großbuchstaben enthalten",
    };
  }

  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      message: "Passwort muss mindestens einen Kleinbuchstaben enthalten",
    };
  }

  if (!/[0-9]/.test(password)) {
    return {
      valid: false,
      message: "Passwort muss mindestens eine Zahl enthalten",
    };
  }

  return { valid: true, message: "" };
}
