import { validatePasswordStrength } from "~/shared/utils/limits";
import type { UserCreatePayload } from "~/types/auth";
import type { ClientConfig, PasswordPolicy } from "~/types/instance";

/** Checks the new-user form before it is sent; returns an error text or null. */
export function newUserProblem(
  form: UserCreatePayload,
  config: Pick<ClientConfig, "passwordPolicy" | "username">
): string | null {
  if (!form.username || !form.password) return "Benutzername und Passwort sind erforderlich.";
  const minLength = config.username.minLength;
  if (form.username.trim().length < minLength) return `Der Benutzername braucht mindestens ${minLength} Zeichen.`;
  const strength = validatePasswordStrength(form.password, config.passwordPolicy);
  return strength.valid ? null : strength.message;
}

/** Checks the change-password form before it is sent; returns an error text or null. */
export function passwordChangeProblem(
  current: string,
  next: string,
  repeat: string,
  policy: PasswordPolicy
): string | null {
  if (!current || !next || !repeat) return "Alle Felder ausfüllen";
  if (next !== repeat) return "Neue Passwörter stimmen nicht überein";
  const strength = validatePasswordStrength(next, policy);
  return strength.valid ? null : strength.message;
}
