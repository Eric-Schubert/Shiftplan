import { describe, expect, it } from "vitest";
import { retentionPeriods } from "~/shared/utils/retention";
import { PRIVACY_SECTION_IDS } from "~/utils/legal/privacy";
import { isGermanText } from "./helpers/german-text";
import { IMPRINT, NO_IMPRINT, renderImprint, renderPrivacy, sectionIds, textOf, type LegalSetup } from "./helpers/legal-render";

// German names the English text keeps: laws, the Saxon authority, an address, and the labels of the
// app, which is German only.
const GERMAN_NAMES = [
  "Telekommunikation-Digitale-Dienste-Datenschutz-Gesetz",
  "Digitale-Dienste-Gesetz",
  "Sächsische Datenschutz- und Transparenzbeauftragte",
  "Emmy-Noether-Straße",
  "QR-Code scannen",
  "Ohne Kamera einrichten",
  "Von diesem Gerät entfernen",
  "Menü",
  "Einstellungen",
  "Benachrichtigungen",
  "Alle",
  "Aus",
  "USt-IdNr.",
  "W-IdNr.",
  ...Object.values(IMPRINT).filter(Boolean),
];

/** Sentences of the English text that read as German once the names above are taken out. */
function germanSentences(html: string): string[] {
  const text = GERMAN_NAMES.reduce((rest, name) => rest.replaceAll(name, ""), textOf(html));
  return text.split(/(?<=[.:;])\s+/).filter((sentence) => isGermanText(sentence));
}

/** Count of each block element per privacy section: the translation leaves nothing out, the notice aside. */
function blocks(html: string): string[] {
  const withoutNotice = html.replace(/<p[^>]*> This is a translation for convenience;.*?<\/p>/, "");
  return withoutNotice.split(/<section id=/).map((section) => ["<p", "<li", "<dt", "<h4"].map((tag) => section.split(tag).length - 1).join("/"));
}

const VARIANTS: Array<[string, Partial<LegalSetup>]> = [
  ["defaults", {}],
  ["without Microsoft and app pushes", { facts: { microsoft: false, appPush: false, defaultRelay: false } }],
  [
    "with Cloudflare, a hoster and an own relay",
    { cloudflare: true, hoster: "netcup GmbH, Karlsruhe", hosterLocation: "DE", facts: { defaultRelay: false, relayHost: "push.example.org" } },
  ],
  ["without an imprint, with a hoster without location", { imprint: NO_IMPRINT, hoster: "netcup GmbH, Karlsruhe" }],
  ["as the demo", { demo: true }],
];

describe("English privacy policy", () => {
  it("renders with the German section ids in the same order", async () => {
    const [german, english] = await Promise.all([renderPrivacy({ locale: "de" }), renderPrivacy({ locale: "en" })]);

    expect(sectionIds(german.html)).toEqual([...PRIVACY_SECTION_IDS]);
    expect(sectionIds(english.html)).toEqual([...PRIVACY_SECTION_IDS]);
    expect(german.html).toContain("Datenschutzerklärung</h2>");
    expect(english.html).toContain("Privacy policy</h2>");
    expect(english.seo.title).toBe("Privacy policy | Shiftplan");
    expect(german.seo.title).toBe("Datenschutz | Shiftplan");
  });

  it("says that the German version is binding and links back to it", async () => {
    const english = textOf((await renderPrivacy({ locale: "en" })).html);
    expect(english).toContain("This is a translation for convenience; the German version is legally binding. Read the German version");
    expect(textOf((await renderPrivacy({ locale: "de" })).html)).not.toContain("translation");
  });

  it("words the periods in English", async () => {
    const text = textOf((await renderPrivacy({ locale: "en", facts: { retentionDays: retentionPeriods(30) } })).html);

    expect(text).toContain("deleted automatically 90 days after the day of absence");
    expect(text).toContain("are deleted one year after receipt");
    expect(text).toContain("Entries are deleted automatically after 2 years");
    expect(text).toContain("for one year in the cookie shiftplan_locale");
    expect(text).toContain("limited to a maximum of 30 days");
    expect(text).toContain("keeps the planner sign-in active for up to 30 minutes");
  });

  it.each(VARIANTS)("translates every block %s, without German", async (_, setup) => {
    const [german, english] = await Promise.all([renderPrivacy({ ...setup, locale: "de" }), renderPrivacy({ ...setup, locale: "en" })]);

    expect(blocks(english.html)).toEqual(blocks(german.html));
    expect(germanSentences(english.html)).toEqual([]);
    expect(germanSentences(german.html).length).toBeGreaterThan(50);
  });

  it("is also reachable as /privacy", async () => {
    expect((await renderPrivacy({ locale: "en" })).pageMeta.alias).toEqual(["/privacy"]);
  });
});

describe("English legal notice", () => {
  it("renders provider and contact form in English with the same fields", async () => {
    const [german, english] = await Promise.all([renderImprint({ locale: "de" }), renderImprint({ locale: "en" })]);
    const ids = (html: string) => [...html.matchAll(/ (?:id|for)="([^"]+)"/g)].map((match) => match[1]);

    expect(ids(english.html)).toEqual(ids(german.html));
    expect(english.seo.title).toBe("Legal notice | Shiftplan");
    expect(german.seo.title).toBe("Impressum | Shiftplan");
    expect(textOf(english.html)).toContain("Information pursuant to Section 5 of the German Digital Services Act (Digitale-Dienste-Gesetz, DDG)");
    expect(textOf(english.html)).toContain("Represented by Eric Schubert Email info@example.com Phone +49 351 000000 VAT ID no. (USt-IdNr.) DE123456789");
    expect(textOf(english.html)).toContain("the German version is legally binding");
    expect(germanSentences(english.html)).toEqual([]);
  });

  it("links to the English paths and is reachable as /imprint", async () => {
    const english = await renderImprint({ locale: "en" });
    expect(english.pageMeta.alias).toEqual(["/imprint"]);
    expect(english.html).toContain('href="/privacy"');
    expect((await renderPrivacy({ locale: "en" })).html).toContain('href="/imprint"');
  });
});
