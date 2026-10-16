import { validatePasswordStrength } from "~/shared/utils/limits";
import { getBackendConfig } from "./backend-config";

const MS_PER_MINUTE = 60 * 1000;

export function getAuthConfig() {
  return getBackendConfig().auth;
}

function getPasswordPolicyConfig() {
  return getAuthConfig().passwordPolicy;
}

export function getMaxPasswordLength(): number {
  return getPasswordPolicyConfig().maxLength;
}

export function validateConfiguredPasswordStrength(password: string): {
  valid: boolean;
  message: string;
} {
  return validatePasswordStrength(password, getPasswordPolicyConfig());
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
