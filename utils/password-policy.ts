import backendConfig from "../config/backend.config.json";

const passwordPolicy = backendConfig.auth.passwordPolicy;

export const MIN_PASSWORD_LENGTH = passwordPolicy.minLength;
export const MAX_PASSWORD_LENGTH = passwordPolicy.maxLength;
export const PASSWORD_POLICY_HINT = passwordPolicy.hint;

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

  if (passwordPolicy.requireUppercase && !/[A-Z]/.test(password)) {
    return {
      valid: false,
      message: "Passwort muss mindestens einen Großbuchstaben enthalten",
    };
  }

  if (passwordPolicy.requireLowercase && !/[a-z]/.test(password)) {
    return {
      valid: false,
      message: "Passwort muss mindestens einen Kleinbuchstaben enthalten",
    };
  }

  if (passwordPolicy.requireNumber && !/[0-9]/.test(password)) {
    return {
      valid: false,
      message: "Passwort muss mindestens eine Zahl enthalten",
    };
  }

  return { valid: true, message: "" };
}
