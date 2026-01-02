import type { Shift, ShiftCreateDTO, ShiftUpdateDTO } from "~/types/shift";
import { getDatabase } from "~/server/utils/database";

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
    const stmt = db.prepare(
      "INSERT INTO shifts (name, start_time, end_time, color, min_staff, sort_order) VALUES (?, ?, ?, ?, ?, ?)"
    );
    const result = stmt.run(
      data.name,
      data.start_time,
      data.end_time,
      data.color ?? "#6366f1",
      data.min_staff ?? 1,
      data.sort_order ?? 0
    );
    return this.getById(result.lastInsertRowid as number)!;
  },

  update(id: number, data: ShiftUpdateDTO): Shift | undefined {
    const db = getDatabase();
    const current = this.getById(id);
    if (!current) return undefined;

    db.prepare(
      "UPDATE shifts SET name = ?, active = ?, start_time = ?, end_time = ?, color = ?, min_staff = ?, sort_order = ? WHERE shift_id = ?"
    ).run(
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

  delete(id: number): boolean {
    const db = getDatabase();
    const result = db.prepare("DELETE FROM shifts WHERE shift_id = ?").run(id);
    return result.changes > 0;
  },
};
