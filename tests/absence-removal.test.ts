import { describe, expect, it } from "vitest";
import { t } from "~/i18n/server";
import { removalNotice } from "../utils/absence-removal";

// The notice as the German dialog shows it.
function german(row: typeof range, today: string) {
  const { text, confirm } = removalNotice("de-DE", row, today);
  return { text: t("de", text.key, text.params), confirm: t("de", confirm) };
}

const range = { staff_name: "Anna Weber", absence_date: "2026-10-05", range_from: "2026-10-05", range_to: "2026-10-09" };

describe("question before removing an absence", () => {
  it("ends a running range today and deletes the others", () => {
    expect(german(range, "2026-10-07")).toEqual({
      text: "Ausfall von Anna Weber (Mo. 05.10. – Fr. 09.10.) ab heute beenden? Die Tage bis gestern bleiben eingetragen.",
      confirm: "Ab heute beenden",
    });
    expect(german(range, "2026-10-05").confirm).toBe("Löschen");
    expect(german({ ...range, range_to: "2026-10-05" }, "2026-10-07")).toEqual({
      text: "Ausfall von Anna Weber am Mo. 05.10. löschen?",
      confirm: "Löschen",
    });
  });
});
