import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { repoFiles } from "../scripts/repo-files.js";
import { isGermanText, stringTexts } from "./helpers/german-text";

// The contact mail, holiday lookups, server routes and the default instance name take their texts from
// i18n/locales/de/{mail,holidays,app}.ts. An entry here needs a reason.
const SERVER_TEXT_CODE = [
  /^server\/services\/contact-mail(?:\.service\.ts$|\/)/,
  /^server\/lib\/holidays\//,
  /^server\/services\/(?:public|school)-holiday\.service\.ts$/,
  /^server\/routes\//,
  /^server\/services\/team-access\/settings\.ts$/,
];
const ALLOWED: Array<{ file: string; text: string; reason: string }> = [];
// Words the shared detector misses: „Kontaktanfrage von …“, „Eingegangen: …“, „Betreff: …“ in the mail,
// „Dienstplan im Browser planen …“ in the manifest.
const MORE_WORDS = /kontakt|\b(?:eingegangen|betreff|dienstplan\w*|planen|ansehen)\b/i;

/** German text in these files, as "file:line text". */
function findings(file: string, source: string): string[] {
  return stringTexts(source)
    .filter(([, text]) => isGermanText(text) || MORE_WORDS.test(text))
    .map(([line, text]) => `${file}:${line} ${text}`);
}

describe("server text catalog guard", () => {
  it("finds no German text in mail, holiday, route and instance settings code", () => {
    const files = repoFiles().filter((file: string) => SERVER_TEXT_CODE.some((pattern) => pattern.test(file)));
    const found = files.flatMap((file: string) => findings(file, fs.readFileSync(file, "utf-8")));
    const unexplained = found.filter((hit) => !ALLOWED.some(({ file, text }) => hit.startsWith(`${file}:`) && hit.endsWith(text)));

    expect(files).toEqual(
      expect.arrayContaining([
        "server/services/contact-mail/message.ts",
        "server/lib/holidays/open-holidays.ts",
        "server/services/public-holiday.service.ts",
        "server/services/school-holiday.service.ts",
        "server/routes/manifest.json.ts",
        "server/services/team-access/settings.ts",
      ])
    );
    expect(unexplained).toEqual([]);
  });

  // Each line must be reported with the given text; null lines are fine.
  const probes: Array<[string, string | null]> = [
    ["const subject = message.subject || `Kontaktanfrage von ${message.name}`;", "Kontaktanfrage von {}"],
    ["`Eingegangen: ${formatMessageDate(message.created_at)}`,", "Eingegangen: {}"],
    ['`Betreff: ${message.subject || "-"}`,', "Betreff: {}"],
    ['"Neue Kontaktanfrage über den Schichtplaner",', "Neue Kontaktanfrage über den Schichtplaner"],
    ['"Nachricht:",', "Nachricht:"],
    ['name: pickGermanName(holiday.name, "Unbekannt"),', "Unbekannt"],
    ['name: pickGermanName(holiday.name, "Schulferien"),', "Schulferien"],
    ['const DEFAULT_INSTANCE_NAME = "Schichtplaner";', "Schichtplaner"],
    ['description: "Dienstplan im Browser planen, im Team per App ansehen.",', "Dienstplan im Browser planen, im Team per App ansehen."],
    ['name: t(locale, "mail.contact.subject", { name: message.name }),', null],
    ['const INSTANCE_NAME_SETTING = "instance_name";', null],
    ['return ["1", "true", "yes", "ja", "on"].includes(value);', null],
    ['const url = getHolidayApiUrl("SchoolHolidays", { countryIsoCode: "DE" });', null],
    ['"content-type": "application/manifest+json; charset=utf-8",', null],
    ['{ src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },', null],
  ];

  it.each(probes)("checks %s", (source, expected) => {
    const found = findings("x.ts", source);
    if (expected === null) expect(found).toEqual([]);
    else expect(found).toContain(`x.ts:1 ${expected}`);
  });
});
