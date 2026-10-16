import { describe, expect, it } from "vitest";
import { RotationExcelService, db, useRotationExcelModules } from "./helpers/rotation-excel";

describe("Excel round trip with deactivated staff and shifts", () => {
  useRotationExcelModules();

  it("keeps their hidden pattern rows for when they come back", () => {
    db.prepare("INSERT INTO shifts (name, active, start_time, end_time, sort_order) VALUES ('Saison', 0, '08:00', '16:00', 3)").run();
    // The inactive staff member (3) in the early shift (1), Anna (1) in the inactive seasonal shift (3).
    db.prepare("INSERT INTO rotation_pattern (pattern_week, staff_id, shift_id) VALUES (2, 3, 1), (1, 1, 3)").run();

    const result = RotationExcelService.importTemplate(RotationExcelService.createTemplate());
    const rows = db.prepare("SELECT pattern_week, staff_id, shift_id FROM rotation_pattern ORDER BY pattern_week, staff_id, shift_id").all();

    expect(result.importedAssignments).toBe(1);
    expect(rows).toEqual([
      { pattern_week: 1, staff_id: 1, shift_id: 1 },
      { pattern_week: 1, staff_id: 1, shift_id: 3 },
      { pattern_week: 2, staff_id: 3, shift_id: 1 },
    ]);
  });
});
