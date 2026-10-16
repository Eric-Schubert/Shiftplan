import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { repoFiles } from "../scripts/repo-files.js";
import { PUSH_CODE, pushTextFindings } from "./helpers/push-texts";

// Push titles and bodies belong in i18n/locales/de/push*.ts and are rendered per recipient with t().
// An entry here needs a reason.
const ALLOWED: Array<{ file: string; text: string; reason: string }> = [];

describe("push text catalog guard", () => {
  it("finds no German text in push code", () => {
    const files = repoFiles().filter((file: string) => PUSH_CODE.some((pattern) => pattern.test(file)));
    const found = files.flatMap((file: string) => pushTextFindings(file, fs.readFileSync(file, "utf-8")));
    const unexplained = found.filter((hit) => !ALLOWED.some(({ file, text }) => hit.startsWith(`${file}:`) && hit.endsWith(text)));

    expect(files.length).toBeGreaterThan(20);
    expect(unexplained).toEqual([]);
  });

  // Each line must be reported with the given text; null lines are fine.
  const probes: Array<[string, string | null]> = [
    ['notifyStaff(ids, "Anfrage abgelehnt", body);', "Anfrage abgelehnt"],
    ['const title = "Tauschanfrage";', "Tauschanfrage"],
    ['const title = "Storno bestätigt";', "Storno bestätigt"],
    ["const body = `${name} kann ${request} nicht tauschen.`;", "{} kann {} nicht tauschen."],
    ["const body = `${name} fällt ${label} aus${shift}`;", "{} fällt {} aus{}"],
    ['const more = `… und ${count} weitere Änderungen`;', "… und {} weitere Änderungen"],
    ["const line = `${a} ${b ? `neu: ${b}` : 'entfällt'}`;", "entfällt"],
    ["// Die Planung hat die Übernahme nicht freigegeben.", null],
    ['const title = t(locale, "push.requests.cancelled.title");', null],
    ['export const REQUESTS_URL = "/?anfragen=1";', null],
    ['console.error("[push] Sending failed:", reason);', null],
    ["const url = `/?year=${year}&week=${week}`;", null],
    ['const sql = "SELECT token, staff_id, scope, locale FROM push_devices";', null],
  ];

  it.each(probes)("checks %s", (source, expected) => {
    const found = pushTextFindings("x.ts", source);
    if (expected === null) expect(found).toEqual([]);
    else expect(found).toContain(`x.ts:1 ${expected}`);
  });
});
