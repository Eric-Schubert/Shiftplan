import { getDatabase } from "~/server/utils/database";

export function badRequest(message: string): never {
  throw createError({ statusCode: 400, statusMessage: message });
}

export function conflict(message: string): never {
  throw createError({ statusCode: 409, statusMessage: message });
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isAbsent(staffId: number, date: string): boolean {
  return Boolean(
    getDatabase()
      .prepare("SELECT 1 FROM absences WHERE staff_id = ? AND absence_date = ? AND cancelled_at IS NULL")
      .get(staffId, date)
  );
}

export function activeStaffName(staffId: number): string | null {
  const row = getDatabase().prepare("SELECT name FROM staff WHERE staff_id = ? AND active = 1").get(staffId) as
    | { name: string }
    | undefined;
  return row?.name ?? null;
}
