import type { H3Event } from "h3";
import { validatePasswordStrength } from "~/shared/utils/limits";
import { apiError } from "~/server/utils/api-error";
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

/** The 400 for the first auth.passwordPolicy rule the password breaks, or null. */
export function passwordPolicyError(event: H3Event, password: string) {
  const policy = getPasswordPolicyConfig();
  const { rule } = validatePasswordStrength(password, policy);
  return rule ? apiError(event, 400, `errors.auth.password.${rule}`, { min: policy.minLength, max: policy.maxLength }) : null;
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
