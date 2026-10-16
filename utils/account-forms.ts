import { validatePasswordStrength, type PasswordRule, type PasswordRules } from "~/shared/utils/limits";
import type { MessageKey, MessageRef } from "~/i18n/types";
import type { UserCreatePayload } from "~/types/auth";
import type { ClientConfig, PasswordPolicy } from "~/types/instance";

// The server words a broken rule with the same messages.
const PASSWORD_RULE_KEYS = {
  minLength: "errors.auth.password.minLength",
  maxLength: "errors.auth.password.maxLength",
  uppercase: "errors.auth.password.uppercase",
  lowercase: "errors.auth.password.lowercase",
  number: "errors.auth.password.number",
} as const satisfies Record<PasswordRule, MessageKey>;

/** The first password rule broken, worded like the server's error, or null. */
function passwordProblem(password: string, policy: PasswordRules): MessageRef | null {
  const { rule } = validatePasswordStrength(password, policy);
  if (!rule) return null;
  return { key: PASSWORD_RULE_KEYS[rule], params: { min: policy.minLength, max: policy.maxLength } };
}

/** Checks the new-user form before it is sent; returns the error message or null. */
export function newUserProblem(
  form: UserCreatePayload,
  config: Pick<ClientConfig, "passwordPolicy" | "username">
): MessageRef | null {
  if (!form.username || !form.password) return { key: "settings.users.form.required" };
  const min = config.username.minLength;
  if (form.username.trim().length < min) return { key: "settings.users.form.usernameTooShort", params: { min } };
  return passwordProblem(form.password, config.passwordPolicy);
}

/** Checks the change-password form before it is sent; returns the error message or null. */
export function passwordChangeProblem(
  current: string,
  next: string,
  repeat: string,
  policy: PasswordPolicy
): MessageRef | null {
  if (!current || !next || !repeat) return { key: "settings.auth.changePassword.allFields" };
  if (next !== repeat) return { key: "settings.auth.changePassword.mismatch" };
  return passwordProblem(next, policy);
}
