import type { Staff, StaffCreateDTO, StaffUpdateDTO } from "~/types/staff";
import { getDatabase } from "~/server/utils/database";
import { removeStaffAccess } from "~/server/services/member-access.service";
import { ShiftRequestService } from "~/server/services/shift-request.service";
import { ShiftplanService } from "~/server/services/shiftplan.service";
import { DayChangeService } from "~/server/services/day-change.service";
import { AuditService } from "~/server/services/audit.service";
import { planningWeek } from "~/server/utils/planning-date";
import { isoWeekRange } from "~/shared/utils/week";
import { isValidShortCode, normalizeShortCode, suggestShortCode } from "~/server/lib/migrations/staff-short-code.js";
import { apiError } from "~/server/utils/api-error";

function takenShortCodes(exceptId?: number): Set<string> {
  const rows = getDatabase()
    .prepare("SELECT short_code FROM staff WHERE short_code IS NOT NULL AND staff_id != ?")
    .all(exceptId ?? 0) as Array<{ short_code: string }>;
  return new Set(rows.map((row) => row.short_code));
}

/** Validates a short code typed by a planner; throws on bad format or when someone else has it. */
function checkShortCode(value: string, exceptId?: number): string {
  const code = normalizeShortCode(value);
  if (!isValidShortCode(code)) {
    throw apiError(null, 400, "errors.staff.shortCodeFormat");
  }
  if (takenShortCodes(exceptId).has(code)) {
    throw apiError(null, 409, "errors.staff.shortCodeTaken", { code });
  }
  return code;
}

/** A person as the team sees them: no short code, which is the user name of the PIN sign-in. */
export type PublicStaff<T extends { short_code?: string | null }> = Omit<T, "short_code">;

export type StaffActor = { userId: number; username: string; source: "web" | "app" };

/**
 * Leaving clears the weeks after this one, which then no longer count the person as staffed: assignments
 * and single-day changes. This week and earlier ones keep them as history; reactivating brings nothing back.
 */
function clearWeeksAfterThisOne(staffId: number, actor: StaffActor | undefined): void {
  const thisWeek = planningWeek();
  const nextWeek = ShiftplanService.listWeeks(thisWeek.year, thisWeek.week, 2)[1]!;
  const count = ShiftplanService.removeStaffAfterWeek(staffId, thisWeek);
  const days = DayChangeService.removeStaffAfter(staffId, isoWeekRange(thisWeek.year, thisWeek.week).end);
  if (!actor || count + days === 0) return;

  AuditService.log({
    userId: actor.userId,
    username: actor.username,
    action: "unassign",
    year: nextWeek.year,
    weekNumber: nextWeek.week,
    staffId,
    reason: { key: "audit.reason.staffDeactivated", params: { count, days, year: nextWeek.year, week: nextWeek.week } },
    source: actor.source,
  });
}

export const StaffService = {
  publicFields<T extends { short_code?: string | null }>({ short_code: _shortCode, ...staff }: T): PublicStaff<T> {
    return staff;
  },

  getAll(): Staff[] {
    const db = getDatabase();
    return db.prepare("SELECT * FROM staff ORDER BY name").all() as Staff[];
  },

  getActive(): Staff[] {
    const db = getDatabase();
    return db.prepare("SELECT * FROM staff WHERE active = 1 ORDER BY name").all() as Staff[];
  },

  getById(id: number): Staff | undefined {
    const db = getDatabase();
    return db.prepare("SELECT * FROM staff WHERE staff_id = ?").get(id) as Staff | undefined;
  },

  create(data: StaffCreateDTO): Staff {
    const db = getDatabase();
    const shortCode = data.short_code ? checkShortCode(data.short_code) : suggestShortCode(data.name, takenShortCodes());
    const stmt = db.prepare("INSERT INTO staff (name, active, is_parttime, short_code) VALUES (?, ?, ?, ?)");
    const result = stmt.run(data.name, data.active ?? 1, data.is_parttime ?? 0, shortCode);
    return this.getById(result.lastInsertRowid as number)!;
  },

  /** `actor` names who deactivates someone in the audit entry about the weeks cleared then. */
  update(id: number, data: StaffUpdateDTO, actor?: StaffActor): Staff | undefined {
    const db = getDatabase();
    const current = this.getById(id);
    if (!current) return undefined;

    const shortCode =
      data.short_code !== undefined
        ? checkShortCode(data.short_code, id)
        : (current.short_code ?? suggestShortCode(data.name ?? current.name, takenShortCodes(id)));
    const active = data.active ?? current.active;
    db.transaction(() => {
      db.prepare("UPDATE staff SET name = ?, active = ?, is_parttime = ?, short_code = ? WHERE staff_id = ?").run(
        data.name ?? current.name,
        active,
        data.is_parttime ?? current.is_parttime,
        shortCode,
        id
      );
      // Open requests go too, so accepting one cannot put the person back into the plan.
      if (!active) ShiftRequestService.cancelForStaff(id);
      if (current.active && !active) clearWeeksAfterThisOne(id, actor);
    })();
    // A deactivated person loses app and browser access and gets no more team pushes (admin database).
    if (!active) removeStaffAccess(id);
    return this.getById(id);
  },

  delete(id: number): boolean {
    const db = getDatabase();
    const result = db.prepare("DELETE FROM staff WHERE staff_id = ?").run(id);
    if (result.changes > 0) removeStaffAccess(id);
    return result.changes > 0;
  },
};
