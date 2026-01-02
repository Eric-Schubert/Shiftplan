import type { Staff, StaffCreateDTO, StaffUpdateDTO } from "~/types/staff";
import { getDatabase } from "~/server/utils/database";

export const StaffService = {
  getAll(): Staff[] {
    const db = getDatabase();
    return db.prepare("SELECT * FROM staff ORDER BY name").all() as Staff[];
  },

  getActive(): Staff[] {
    const db = getDatabase();
    return db
      .prepare("SELECT * FROM staff WHERE active = 1 ORDER BY name")
      .all() as Staff[];
  },

  getById(id: number): Staff | undefined {
    const db = getDatabase();
    return db
      .prepare("SELECT * FROM staff WHERE staff_id = ?")
      .get(id) as Staff | undefined;
  },

  create(data: StaffCreateDTO): Staff {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO staff (name, active, is_parttime) 
      VALUES (?, ?, ?)
    `);
    const result = stmt.run(
      data.name,
      data.active ?? 1,
      data.is_parttime ?? 0
    );

    return this.getById(result.lastInsertRowid as number)!;
  },

  update(id: number, data: StaffUpdateDTO): Staff | undefined {
    const db = getDatabase();
    const current = this.getById(id);
    if (!current) return undefined;

    const stmt = db.prepare(`
      UPDATE staff 
      SET name = ?, active = ?, is_parttime = ?
      WHERE staff_id = ?
    `);
    stmt.run(
      data.name ?? current.name,
      data.active ?? current.active,
      data.is_parttime ?? current.is_parttime,
      id
    );

    return this.getById(id);
  },

  delete(id: number): boolean {
    const db = getDatabase();
    const result = db
      .prepare("DELETE FROM staff WHERE staff_id = ?")
      .run(id);
    return result.changes > 0;
  },
};
