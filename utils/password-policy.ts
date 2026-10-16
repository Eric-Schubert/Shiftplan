import type { PasswordPolicy } from "~/types/instance";

/** Early feedback in the form; the server checks the same policy and has the final say. */
export function validatePasswordStrength(
  password: string,
  policy: PasswordPolicy
): {
  valid: boolean;
  message: string;
} {
  if (password.length < policy.minLength) {
    return {
      valid: false,
      message: `Passwort muss mindestens ${policy.minLength} Zeichen haben`,
    };
  }

  if (password.length > policy.maxLength) {
    return {
      valid: false,
      message: `Passwort darf maximal ${policy.maxLength} Zeichen haben`,
    };
  }

  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    return {
      valid: false,
      message: "Passwort muss mindestens einen Großbuchstaben enthalten",
    };
  }

  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    return {
      valid: false,
      message: "Passwort muss mindestens einen Kleinbuchstaben enthalten",
    };
  }

  if (policy.requireNumber && !/[0-9]/.test(password)) {
    return {
      valid: false,
      message: "Passwort muss mindestens eine Zahl enthalten",
    };
  }

  return { valid: true, message: "" };
}
