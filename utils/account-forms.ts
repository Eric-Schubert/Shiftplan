import { validatePasswordStrength, type PasswordRules } from "~/shared/utils/limits";
import type { MessageRef } from "~/i18n/types";
import type { UserCreatePayload } from "~/types/auth";
import type { ClientConfig, PasswordPolicy } from "~/types/instance";

/** The first password rule broken, worded like the server's error, or null. */
function passwordProblem(password: string, policy: PasswordRules): MessageRef | null {
  const { rule } = validatePasswordStrength(password, policy);
  if (!rule) return null;
  return { key: `errors.auth.password.${rule}`, params: { min: policy.minLength, max: policy.maxLength } };
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
