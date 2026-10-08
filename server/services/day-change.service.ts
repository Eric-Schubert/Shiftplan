import { getDatabase } from "~/server/utils/database";
import { datesOfISOWeek, parseISODate, weekOfDate } from "~/server/utils/iso-week";

export type DayChangeKind = "add" | "remove";

export type DayChange = {
  change_id: number;
  staff_id: number;
  staff_name: string;
  shift_id: number;
  shift_name: string;
  change_date: string;
  kind: DayChangeKind;
  source: "web" | "app";
  created_by: string;
  created_at: string;
};

function badRequest(message: string): never {
  throw createError({ statusCode: 400, statusMessage: message });
}

function isInWeeklyPlan(staffId: number, shiftId: number, date: string): boolean {
  const { year, week } = weekOfDate(date);
  return Boolean(
    getDatabase()
      .prepare(
        `
          SELECT 1 FROM shift_assignments sa
          JOIN weeks w ON w.week_id = sa.week_id
          WHERE sa.staff_id = ? AND sa.shift_id = ? AND w.year = ? AND w.week_number = ?
        `
      )
      .get(staffId, shiftId, year, week)
  );
}

/**
 * Day-level exceptions on top of the weekly plan. The weekly assignment stays the
 * default; a change only records where a single day differs from it.
 */
export const DayChangeService = {
  listForWeek(year: number, week: number): DayChange[] {
    const dates = datesOfISOWeek(year, week);
    return getDatabase()
      .prepare(
        `
          SELECT c.change_id, c.staff_id, st.name AS staff_name, c.shift_id, sh.name AS shift_name,
                 c.change_date, c.kind, c.source, c.created_by, c.created_at
          FROM shift_day_changes c
          JOIN staff st ON st.staff_id = c.staff_id
          JOIN shifts sh ON sh.shift_id = c.shift_id
          WHERE c.change_date BETWEEN ? AND ?
          ORDER BY c.change_date, sh.sort_order, st.name
        `
      )
      .all(dates[0], dates[6]) as DayChange[];
  },

  /** Shifts the person actually works on that day: weekly plan plus day changes. */
  shiftsOnDate(staffId: number, date: string): Array<{ shift_id: number; name: string }> {
    const { year, week } = weekOfDate(date);
    return getDatabase()
      .prepare(
        `
          SELECT s.shift_id, s.name FROM shifts s
          WHERE (
            EXISTS (
              SELECT 1 FROM shift_assignments sa JOIN weeks w ON w.week_id = sa.week_id
              WHERE sa.staff_id = ? AND sa.shift_id = s.shift_id AND w.year = ? AND w.week_number = ?
            )
            AND NOT EXISTS (
              SELECT 1 FROM shift_day_changes c
              WHERE c.staff_id = ? AND c.shift_id = s.shift_id AND c.change_date = ? AND c.kind = 'remove'
            )
          ) OR EXISTS (
            SELECT 1 FROM shift_day_changes c
            WHERE c.staff_id = ? AND c.shift_id = s.shift_id AND c.change_date = ? AND c.kind = 'add'
          )
          ORDER BY s.sort_order, s.name
        `
      )
      .all(staffId, year, week, staffId, date, staffId, date) as Array<{ shift_id: number; name: string }>;
  },

  /**
   * Puts someone into or takes them out of a shift for one day. Returns the
   * effective change, or null when the day already looked like that.
   */
  setPresence(input: {
    staffId: number;
    shiftId: number;
    date: string;
    present: boolean;
    source: "web" | "app";
    createdBy: string;
    /** Set when a takeover or swap request makes the change, so it can be undone. */
    requestId?: number;
  }): { kind: DayChangeKind } | null {
    if (!parseISODate(input.date)) badRequest("Ungültiges Datum");
    const db = getDatabase();
    if (!db.prepare("SELECT 1 FROM staff WHERE staff_id = ?").get(input.staffId)) badRequest("Unbekannter Mitarbeiter");
    if (!db.prepare("SELECT 1 FROM shifts WHERE shift_id = ?").get(input.shiftId)) badRequest("Unbekannte Schicht");

    const existing = db
      .prepare("SELECT kind FROM shift_day_changes WHERE staff_id = ? AND shift_id = ? AND change_date = ?")
      .get(input.staffId, input.shiftId, input.date) as { kind: DayChangeKind } | undefined;
    const inPlan = isInWeeklyPlan(input.staffId, input.shiftId, input.date);
    const currentlyPresent = existing ? existing.kind === "add" : inPlan;
    if (currentlyPresent === input.present) return null;

    if (input.present === inPlan) {
      // Back to what the weekly plan says.
      db.prepare("DELETE FROM shift_day_changes WHERE staff_id = ? AND shift_id = ? AND change_date = ?").run(
        input.staffId,
        input.shiftId,
        input.date
      );
    } else {
      db.prepare(
        `
          INSERT INTO shift_day_changes (staff_id, shift_id, change_date, kind, source, created_by, request_id)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(staff_id, shift_id, change_date)
          DO UPDATE SET kind = excluded.kind, source = excluded.source, request_id = excluded.request_id,
                        created_by = excluded.created_by, created_at = datetime('now')
        `
      ).run(
        input.staffId,
        input.shiftId,
        input.date,
        input.present ? "add" : "remove",
        input.source,
        input.createdBy,
        input.requestId ?? null
      );
    }
    return { kind: input.present ? "add" : "remove" };
  },
};
