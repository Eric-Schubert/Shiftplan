import { describe, expect, it } from "vitest";
import { buildPrimeLocale } from "~/utils/primevue-locale";
import de from "~/i18n/locales/de";

// The hand-written German PrimeVue locale that Intl replaced, frozen for comparison.
const LEGACY_DE = {
  firstDayOfWeek: 1,
  dayNames: ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"],
  dayNamesShort: ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"],
  dayNamesMin: ["S", "M", "D", "M", "D", "F", "S"],
  monthNames: ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"],
  monthNamesShort: ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"],
  fileSizeTypes: ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"],
};

describe("PrimeVue locale", () => {
  it("builds the German names from Intl exactly as they were written by hand", () => {
    expect(buildPrimeLocale("de-DE", de.primevue)).toEqual(LEGACY_DE);
  });

  it("starts the week on Monday and lists days from Sunday in other locales too", () => {
    const english = buildPrimeLocale("en-GB", { fileSizeTypes: [] });
    expect(english.firstDayOfWeek).toBe(1);
    expect(english.dayNames[0]).toBe("Sunday");
    expect(english.monthNamesShort[2]).toBe("Mar");
  });
});
