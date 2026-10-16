import { describe, expect, it } from "vitest";
import { removalNotice } from "../utils/absence-removal";

const range = { staff_name: "Anna Weber", absence_date: "2026-10-05", range_from: "2026-10-05", range_to: "2026-10-09" };

describe("question before removing an absence", () => {
  it("ends a running range today and deletes the others", () => {
    expect(removalNotice("de", range, "2026-10-07")).toEqual({
      text: "Ausfall von Anna Weber (Mo. 05.10. – Fr. 09.10.) ab heute beenden? Die Tage bis gestern bleiben eingetragen.",
      confirm: "Ab heute beenden",
    });
    expect(removalNotice("de", range, "2026-10-05").confirm).toBe("Löschen");
    expect(removalNotice("de", { ...range, range_to: "2026-10-05" }, "2026-10-07")).toEqual({
      text: "Ausfall von Anna Weber am Mo. 05.10. löschen?",
      confirm: "Löschen",
    });
  });
});
