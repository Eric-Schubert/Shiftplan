import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { repoFiles } from "../scripts/repo-files.js";
import { germanTextFindings } from "./helpers/push-texts";

// Audit reasons are stored as keys of i18n/locales/de/audit.ts with plain values and rendered when shown.
// This covers the audit service and every file that writes an entry, also ones added later.
const AUDIT_CODE = [
  /^server\/services\/audit(?:\.service\.ts$|\/)/,
  /^server\/services\/absence\/audit\.ts$/,
  /^server\/services\/day-change\/apply\.ts$/,
  /^server\/services\/shift-request\/flow\/apply\.ts$/,
  /^server\/api\/audit\//,
];
// Reasons without umlauts or two stopwords: „nur Do. 08.10.“, „4-Wochen-Zyklus, 12 Zuweisungen“.
const AUDIT_WORDS = /\b(?:nur|unbekannt)\b|\b(?:woche|zuweisung|rotationsmuster|tausch|anfrage|muster)/i;

function auditFiles(): string[] {
  return repoFiles().filter(
    (file: string) =>
      /\.(?:ts|js)$/.test(file) &&
      !file.startsWith("tests/") &&
      (AUDIT_CODE.some((pattern) => pattern.test(file)) || fs.readFileSync(file, "utf-8").includes("AuditService.log("))
  );
}

const findings = (file: string, source: string) => germanTextFindings(file, source, AUDIT_WORDS);

describe("audit text catalog guard", () => {
  it("finds no German text in code that writes audit entries", () => {
    const files = auditFiles();
    const found = files.flatMap((file) => findings(file, fs.readFileSync(file, "utf-8")));

    expect(files).toEqual(
      expect.arrayContaining([
        "server/services/audit.service.ts",
        "server/services/audit/reason.ts",
        "server/services/absence/audit.ts",
        "server/services/day-change/apply.ts",
        "server/services/shift-request/flow/apply.ts",
        "server/api/shiftplan/generate.post.ts",
        "server/api/rotation/excel-import.post.ts",
      ])
    );
    expect(found).toEqual([]);
  });

  // Each line must be reported with the given text; null lines are fine.
  const probes: Array<[string, string | null]> = [
    ["reason: `nur ${day}`,", "nur {}"],
    ['shiftName = shift?.name || "Unbekannt";', "Unbekannt"],
    ["const note = `Tausch ${a} ↔ ${b}`;", "Tausch {} ↔ {}"],
    ['note: "Anfrage zurückgenommen",', "Anfrage zurückgenommen"],
    ["const label = `${cycle}-Wochen-Zyklus, ${count} Zuweisungen`;", "{}-Wochen-Zyklus, {} Zuweisungen"],
    ['const weeks = count === 1 ? "1 Woche" : "Wochen";', "1 Woche"],
    ['reason: { key: "audit.reason.day", params: { date } },', null],
    ['const sql = "SELECT name FROM shifts WHERE shift_id = ?";', null],
    ['const action = change.kind === "add" ? "day_add" : "day_remove";', null],
  ];

  it.each(probes)("checks %s", (source, expected) => {
    const found = findings("x.ts", source);
    if (expected === null) expect(found).toEqual([]);
    else expect(found).toContain(`x.ts:1 ${expected}`);
  });
});
