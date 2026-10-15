import bcrypt from "bcryptjs";
import { getPasswordHashCost } from "~/server/config/auth-config";

let dummyHash: Promise<string> | null = null;

/**
 * Compares a password with the stored hash. Without an account it compares against a dummy
 * hash of the same cost, so the answer time does not reveal which usernames exist.
 */
export async function checkPassword(password: string, passwordHash: string | undefined): Promise<boolean> {
  if (passwordHash) return bcrypt.compare(password, passwordHash);

  dummyHash ??= bcrypt.hash("no-such-account", getPasswordHashCost());
  await bcrypt.compare(password, await dummyHash);
  return false;
}
