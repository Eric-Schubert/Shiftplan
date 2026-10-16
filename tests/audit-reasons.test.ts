import { describe, expect, it } from "vitest";
import { createI18n } from "vue-i18n";
import { entryReason, type AuditReason, type Translate } from "~/i18n/audit-reason";
import { DEFAULT_LOCALE, localeTag } from "~/i18n/config";
import de from "~/i18n/locales/de";
import { readReasonParams, storedReason } from "~/server/services/audit/reason";

const TAG = localeTag(DEFAULT_LOCALE);

// Each reason with the text its producer wrote before reasons became keys. `reason` must stay exactly that.
const CASES: Array<[AuditReason, string]> = [
  [{ key: "audit.reason.day", params: { date: "2026-10-08" } }, "nur Do. 08.10."],
  [{ key: "audit.reason.takeover", params: { name: "Anna Weber", date: "2026-10-08" } }, "Übernahme für Anna Weber, Do. 08.10."],
  [
    { key: "audit.reason.swap", params: { requester: "Anna Weber", partner: "Max Mustermann", date: "2026-10-08" } },
    "Tausch Anna Weber ↔ Max Mustermann, Do. 08.10.",
  ],
  [{ key: "audit.reason.requestReverted", params: { date: "2026-10-09" } }, "Anfrage zurückgenommen, Fr. 09.10."],
  [{ key: "audit.reason.absence", params: { from: "2026-10-08", to: "2026-10-08" } }, "Do. 08.10."],
  [{ key: "audit.reason.absence", params: { from: "2026-10-07", to: "2026-10-09" } }, "Mi. 07.10. – Fr. 09.10."],
  [
    { key: "audit.reason.generated", params: { count: 1, year: 2026, week: 42, overwritten: 0, skipped: 0 } },
    "1 Woche bis KW 42/2026 aus dem Rotationsmuster erzeugt",
  ],
  [
    { key: "audit.reason.generated", params: { count: 4, year: 2027, week: 1, overwritten: 0, skipped: 0 } },
    "4 Wochen bis KW 1/2027 aus dem Rotationsmuster erzeugt",
  ],
  [
    { key: "audit.reason.generatedOverwritten", params: { count: 3, year: 2026, week: 44, overwritten: 2, skipped: 0 } },
    "3 Wochen bis KW 44/2026 aus dem Rotationsmuster erzeugt, 2 davon überschrieben",
  ],
  [
    { key: "audit.reason.generatedSkipped", params: { count: 1, year: 2026, week: 42, overwritten: 0, skipped: 3 } },
    "1 Woche bis KW 42/2026 aus dem Rotationsmuster erzeugt, 3 bereits geplante übersprungen",
  ],
  [
    { key: "audit.reason.patternImported", params: { cycle: 4, count: 1 } },
    "Rotationsmuster aus Excel ersetzt: 4-Wochen-Zyklus, 1 Zuweisung",
  ],
  [
    { key: "audit.reason.patternImported", params: { cycle: 1, count: 0 } },
    "Rotationsmuster aus Excel ersetzt: 1-Wochen-Zyklus, 0 Zuweisungen",
  ],
  [
    { key: "audit.reason.patternImported", params: { cycle: 6, count: 23 } },
    "Rotationsmuster aus Excel ersetzt: 6-Wochen-Zyklus, 23 Zuweisungen",
  ],
];

// The app renders with vue-i18n like AuditLogEntry.vue: the plural count is its own argument.
const app = createI18n({ legacy: false, locale: DEFAULT_LOCALE, messages: { de } }).global;
const appTranslate: Translate = (key, params) =>
  typeof params.count === "number" ? app.t(key, params, params.count) : app.t(key, params);
const known = (key: string) => app.te(key);

/** An entry as GET /api/audit returns it after the server stored `reason`. */
function written(reason: AuditReason) {
  const stored = storedReason(reason);
  return { reason: stored.text, reason_key: stored.key, reason_params: readReasonParams(stored.params) };
}

describe("audit reasons", () => {
  it("have an example for every reason in the catalog", () => {
    const tested = new Set(CASES.map(([reason]) => reason.key));
    const catalog = Object.keys(de.audit.reason).map((name) => `audit.reason.${name}`);
    expect([...tested].sort()).toEqual(catalog.sort());
  });

  it.each(CASES)("stores %j with the text written before keys", (reason, text) => {
    expect(storedReason(reason).text).toBe(text);
  });

  it.each(CASES)("renders %j in the app exactly like the stored text", (reason, text) => {
    const entry = written(reason);
    expect(entry.reason).toBe(text);
    expect(entryReason({ ...entry, reason: null }, TAG, appTranslate, known)).toBe(text);
  });

  it("stores names with message syntax characters as plain values", () => {
    const entry = written({ key: "audit.reason.takeover", params: { name: "A|B {x} @c", date: "2026-10-08" } });
    expect(entry.reason).toBe("Übernahme für A|B {x} @c, Do. 08.10.");
    expect(entryReason({ ...entry, reason: null }, TAG, appTranslate, known)).toBe(entry.reason);
  });

  it("shows entries from before keys as stored", () => {
    const entry = { reason: "nur Do. 08.10.", reason_key: null, reason_params: null };
    expect(entryReason(entry, TAG, appTranslate, known)).toBe("nur Do. 08.10.");
    expect(entryReason({ ...entry, reason: null }, TAG, appTranslate, known)).toBeNull();
  });

  it("shows the stored text for keys the catalog no longer has and for unreadable values", () => {
    const params = { date: "2026-10-08" };
    expect(entryReason({ reason: "alt", reason_key: "audit.reason.gone", reason_params: params }, TAG, appTranslate, known)).toBe("alt");
    expect(entryReason({ reason: "alt", reason_key: "common.meta.description", reason_params: params }, TAG, appTranslate, known)).toBe("alt");
    expect(readReasonParams("{broken")).toBeNull();
    expect(readReasonParams("[1]")).toBeNull();
    expect(entryReason({ reason: "alt", reason_key: "audit.reason.day", reason_params: null }, TAG, appTranslate, known)).toBe("alt");
  });
});
