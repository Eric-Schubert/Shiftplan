import type { Staff, StaffCreateDTO, StaffUpdateDTO } from "~/types/staff";
import { getDatabase } from "~/server/utils/database";
import { isValidShortCode, normalizeShortCode, suggestShortCode } from "~/server/utils/staff-short-code.js";

function takenShortCodes(exceptId?: number): Set<string> {
  const rows = getDatabase()
    .prepare("SELECT short_code FROM staff WHERE short_code IS NOT NULL AND staff_id != ?")
    .all(exceptId ?? 0) as Array<{ short_code: string }>;
  return new Set(rows.map((row) => row.short_code));
}

/** Validates a Kürzel typed by a planner; throws on bad format or when someone else has it. */
function checkShortCode(value: string, exceptId?: number): string {
  const code = normalizeShortCode(value);
  if (!isValidShortCode(code)) {
    throw createError({ statusCode: 400, statusMessage: "Kürzel: 2 bis 8 Buchstaben oder Ziffern" });
  }
  if (takenShortCodes(exceptId).has(code)) {
    throw createError({ statusCode: 409, statusMessage: `Das Kürzel ${code} ist schon vergeben` });
  }
  return code;
}

export const StaffService = {
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
    const shortCode = data.short_code
      ? checkShortCode(data.short_code)
      : suggestShortCode(data.name, takenShortCodes());
    const stmt = db.prepare("INSERT INTO staff (name, active, is_parttime, short_code) VALUES (?, ?, ?, ?)");
    const result = stmt.run(data.name, data.active ?? 1, data.is_parttime ?? 0, shortCode);
    return this.getById(result.lastInsertRowid as number)!;
  },

  update(id: number, data: StaffUpdateDTO): Staff | undefined {
    const db = getDatabase();
    const current = this.getById(id);
    if (!current) return undefined;

    const shortCode =
      data.short_code !== undefined
        ? checkShortCode(data.short_code, id)
        : (current.short_code ?? suggestShortCode(data.name ?? current.name, takenShortCodes(id)));
    db.prepare("UPDATE staff SET name = ?, active = ?, is_parttime = ?, short_code = ? WHERE staff_id = ?").run(
      data.name ?? current.name,
      data.active ?? current.active,
      data.is_parttime ?? current.is_parttime,
      shortCode,
      id
    );
    return this.getById(id);
  },

  delete(id: number): boolean {
    const db = getDatabase();
    const result = db.prepare("DELETE FROM staff WHERE staff_id = ?").run(id);
    return result.changes > 0;
  },
};
