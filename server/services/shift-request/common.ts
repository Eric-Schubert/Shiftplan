import { getDatabase } from "~/server/utils/database";
import { planningToday } from "~/server/utils/planning-date";
import type { MessageKey } from "~/server/lib/i18n/translate";
import { apiError, type ErrorParams } from "~/server/utils/api-error";

export function badRequest(key: MessageKey, params?: ErrorParams): never {
  throw apiError(null, 400, key, params);
}

export function conflict(key: MessageKey, params?: ErrorParams): never {
  throw apiError(null, 409, key, params);
}

export function today(): string {
  return planningToday();
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
