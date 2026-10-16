import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// The privacy policy renders its periods from /api/legal/privacy. Only these are written into the
// text: proxy logs (hosting), the demo reset, the app's offline cache and the answer time for
// deletion requests. The English translation names the same ones.
const FIXED: Record<string, string[]> = {
  "LegalPrivacyHeader.vue": ["30 Minuten"],
  "LegalPrivacyProcessing.vue": ["15 Tagen", "zwei Wochen"],
  "LegalPrivacyRetention.vue": ["15 Tagen", "eines Monats"],
};
const FIXED_EN: Record<string, string[]> = {
  "LegalPrivacyHeaderEn.vue": ["30 minutes"],
  "LegalPrivacyProcessingEn.vue": ["15 days", "two weeks"],
  "LegalPrivacyRetentionEn.vue": ["15 days"],
  "LegalPrivacyAppDataEn.vue": ["one month"],
};

const DIR = path.resolve(__dirname, "../components/legal/de");
const DIR_EN = path.resolve(__dirname, "../components/legal/en");
const UNIT = "(?:Tag|Tage|Tagen|Tages|Woche|Wochen|Monat|Monate|Monaten|Monats|Jahr|Jahre|Jahren|Jahres|Minute|Minuten|Stunde|Stunden)";
const COUNT = "(?:\\d+|ein|eine|einen|einem|einer|eines|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|zwölf)";
const PERIOD = new RegExp(`(?<![\\wäöüß])${COUNT}\\s+${UNIT}(?![\\wäöüß])`, "g");
const UNIT_EN = "(?:days?|weeks?|months?|years?|minutes?|hours?)";
const COUNT_EN = "(?:\\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten|twelve)";
const PERIOD_EN = new RegExp(`(?<!\\w)${COUNT_EN}\\s+${UNIT_EN}(?!\\w)`, "gi");

/** Periods written out in a component's template, with line breaks folded into spaces. */
function writtenPeriods(source: string, period = PERIOD): string[] {
  const template = source.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "");
  return template.replace(/\s+/g, " ").match(period) ?? [];
}

function periodsIn(dir: string, period: RegExp): Record<string, string[]> {
  return Object.fromEntries(
    fs
      .readdirSync(dir)
      .filter((file) => file.endsWith(".vue"))
      .map((file) => [file, writtenPeriods(fs.readFileSync(path.join(dir, file), "utf-8"), period)] as const)
      .filter(([, periods]) => periods.length > 0)
  );
}

describe("periods in the legal pages", () => {
  it("writes out only the periods that are not configured or shared", () => {
    expect(periodsIn(DIR, PERIOD)).toEqual(FIXED);
  });

  it("writes out the same periods in the English translation", () => {
    expect(periodsIn(DIR_EN, PERIOD_EN)).toEqual(FIXED_EN);
  });

  it("notices a period typed into the text", () => {
    expect(writtenPeriods("<template><span>Gründe werden nach 90 Tagen gelöscht.</span></template>")).toEqual(["90 Tagen"]);
    expect(writtenPeriods("<template><dd>werden ein\n  Jahr nach Eingang gelöscht.</dd></template>")).toEqual(["ein Jahr"]);
    expect(writtenPeriods('<template>nach {{ periodText(retention.analytics, "dative") }}</template>')).toEqual([]);
    expect(writtenPeriods("<template><dd>are deleted one\n year after receipt.</dd></template>", PERIOD_EN)).toEqual(["one year"]);
  });
});
