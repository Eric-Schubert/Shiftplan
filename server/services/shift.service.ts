import type { Shift, ShiftCreateDTO, ShiftUpdateDTO } from "~/types/shift";
import { getDatabase } from "~/server/utils/database";
import { getShiftDefaults } from "~/server/config/domain-config";

export const ShiftService = {
  getAll(): Shift[] {
    const db = getDatabase();
    return db.prepare("SELECT * FROM shifts ORDER BY sort_order, name").all() as Shift[];
  },

  getActive(): Shift[] {
    const db = getDatabase();
    return db.prepare("SELECT * FROM shifts WHERE active = 1 ORDER BY sort_order, name").all() as Shift[];
  },

  getById(id: number): Shift | undefined {
    const db = getDatabase();
    return db.prepare("SELECT * FROM shifts WHERE shift_id = ?").get(id) as Shift | undefined;
  },

  create(data: ShiftCreateDTO): Shift {
    const db = getDatabase();
    const defaults = getShiftDefaults();
    const stmt = db.prepare("INSERT INTO shifts (name, start_time, end_time, color, min_staff, sort_order) VALUES (?, ?, ?, ?, ?, ?)");
    const result = stmt.run(
      data.name,
      data.start_time,
      data.end_time,
      data.color ?? defaults.color,
      data.min_staff ?? defaults.minStaff,
      data.sort_order ?? defaults.sortOrder
    );
    return this.getById(result.lastInsertRowid as number)!;
  },

  update(id: number, data: ShiftUpdateDTO): Shift | undefined {
    const db = getDatabase();
    const current = this.getById(id);
    if (!current) return undefined;

    db.prepare("UPDATE shifts SET name = ?, active = ?, start_time = ?, end_time = ?, color = ?, min_staff = ?, sort_order = ? WHERE shift_id = ?").run(
      data.name ?? current.name,
      data.active ?? current.active,
      data.start_time ?? current.start_time,
      data.end_time ?? current.end_time,
      data.color ?? current.color,
      data.min_staff ?? current.min_staff,
      data.sort_order ?? current.sort_order,
      id
    );
    return this.getById(id);
  },

  /**
   * Assignments and day changes of the shift go with it (ON DELETE CASCADE). Its absences have to go
   * by hand: the foreign key would set them to no shift, which means absent from every shift that day.
   */
  delete(id: number): boolean {
    const db = getDatabase();
    return db.transaction(() => {
      db.prepare("DELETE FROM absences WHERE shift_id = ?").run(id);
      return db.prepare("DELETE FROM shifts WHERE shift_id = ?").run(id).changes > 0;
    })();
  },
};
