import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// The privacy policy renders its periods from /api/legal/privacy. Only these are written into the
// text: the team code cookie (team-access), proxy logs (hosting), the demo reset, the app's offline
// cache and the answer time for deletion requests.
const FIXED: Record<string, string[]> = {
  "LegalPrivacyHeader.vue": ["30 Minuten"],
  "LegalPrivacyProcessing.vue": ["180 Tage", "15 Tagen", "zwei Wochen"],
  "LegalPrivacyRetention.vue": ["15 Tagen", "180 Tage", "180 Tage", "eines Monats"],
};

const DIR = path.resolve(__dirname, "../components/legal");
const UNIT = "(?:Tag|Tage|Tagen|Tages|Woche|Wochen|Monat|Monate|Monaten|Monats|Jahr|Jahre|Jahren|Jahres|Minute|Minuten|Stunde|Stunden)";
const COUNT = "(?:\\d+|ein|eine|einen|einem|einer|eines|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|zwölf)";
const PERIOD = new RegExp(`(?<![\\wäöüß])${COUNT}\\s+${UNIT}(?![\\wäöüß])`, "g");

/** Periods written out in a component's template, with line breaks folded into spaces. */
function writtenPeriods(source: string): string[] {
  const template = source.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "");
  return template.replace(/\s+/g, " ").match(PERIOD) ?? [];
}

describe("periods in the legal pages", () => {
  it("writes out only the periods that are not configured or shared", () => {
    const found = Object.fromEntries(
      fs
        .readdirSync(DIR)
        .filter((file) => file.endsWith(".vue"))
        .map((file) => [file, writtenPeriods(fs.readFileSync(path.join(DIR, file), "utf-8"))] as const)
        .filter(([, periods]) => periods.length > 0)
    );

    expect(found).toEqual(FIXED);
  });

  it("notices a period typed into the text", () => {
    expect(writtenPeriods("<template><span>Gründe werden nach 90 Tagen gelöscht.</span></template>")).toEqual([
      "90 Tagen",
    ]);
    expect(writtenPeriods("<template><dd>werden ein\n  Jahr nach Eingang gelöscht.</dd></template>")).toEqual([
      "ein Jahr",
    ]);
    expect(writtenPeriods('<template>nach {{ periodText(retention.analytics, "dative") }}</template>')).toEqual([]);
  });
});
