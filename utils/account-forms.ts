import type { UserCreatePayload } from "~/types/auth";
import type { PasswordPolicy } from "~/types/instance";
import { validatePasswordStrength } from "~/utils/password-policy";

/** Checks the new-user form before it is sent; returns an error text or null. */
export function newUserProblem(form: UserCreatePayload, policy: PasswordPolicy): string | null {
  if (!form.username || !form.password) return "Benutzername und Passwort sind erforderlich.";
  if (form.username.trim().length < 3) return "Der Benutzername braucht mindestens 3 Zeichen.";
  const strength = validatePasswordStrength(form.password, policy);
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
