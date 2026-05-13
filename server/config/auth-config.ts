import { getBackendConfig } from "./backend-config";

const MS_PER_MINUTE = 60 * 1000;

export function getAuthConfig() {
  return getBackendConfig().auth;
}

export function getPasswordPolicyConfig() {
  return getAuthConfig().passwordPolicy;
}

export function getMaxPasswordLength(): number {
  return getPasswordPolicyConfig().maxLength;
}

export function validateConfiguredPasswordStrength(password: string): {
  valid: boolean;
  message: string;
} {
  const policy = getPasswordPolicyConfig();

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

export function getPasswordHashCost(): number {
  return getAuthConfig().passwordHashCost;
}

export function getUserValidationConfig() {
  return getAuthConfig().users;
}

export function getSessionDurationMs(): number {
  return getAuthConfig().session.durationMinutes * MS_PER_MINUTE;
}

export function getSessionCookieMaxAgeSeconds(): number {
  return Math.trunc(getSessionDurationMs() / 1000);
}

export function getLoginRateLimitConfig() {
  const rateLimit = getAuthConfig().loginRateLimit;

  return {
    maxAttempts: rateLimit.maxAttempts,
    windowMs: rateLimit.windowMinutes * MS_PER_MINUTE,
    blockMs: rateLimit.blockMinutes * MS_PER_MINUTE,
  };
}
