import { createHash } from "crypto";
import { getDatabase } from "~/server/utils/database";

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function staffName(staffId: number): string | null {
  const row = getDatabase()
    .prepare("SELECT name FROM staff WHERE staff_id = ? AND active = 1")
    .get(staffId) as { name: string } | undefined;
  return row?.name ?? null;
}
