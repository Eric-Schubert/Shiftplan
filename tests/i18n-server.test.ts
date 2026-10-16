import { describe, expect, it, vi } from "vitest";
import { t } from "~/i18n/server";

// A small catalog with the message syntax the real catalogs will use.
vi.mock("~/i18n/locales/de", () => ({
  default: {
    common: { meta: { description: "Beschreibung" } },
    test: {
      greeting: "Hallo {name}",
      days: "ein Tag | {count} Tage",
      email: "support{'@'}example.org",
    },
  },
}));

const key = (value: string) => value as Parameters<typeof t>[1];

describe("server translator", () => {
  it("returns German messages with named parameters", () => {
    expect(t("de", "common.meta.description")).toBe("Beschreibung");
    expect(t("de", key("test.greeting"), { name: "Anna" })).toBe("Hallo Anna");
    expect(t("de", key("test.email"))).toBe("support@example.org");
  });

  it("picks the plural form from a numeric count", () => {
    expect(t("de", key("test.days"), { count: 1 })).toBe("ein Tag");
    expect(t("de", key("test.days"), { count: 5 })).toBe("5 Tage");
  });

  it("falls back to German for unknown locales and to the key for missing messages", () => {
    expect(t("fr", key("test.greeting"), { name: "Anna" })).toBe("Hallo Anna");
    expect(t("", key("test.greeting"), { name: "Anna" })).toBe("Hallo Anna");
    expect(t("de", key("test.missing"))).toBe("test.missing");
  });
});
