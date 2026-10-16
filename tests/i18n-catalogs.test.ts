import { compile } from "@intlify/core";
import { describe, expect, it } from "vitest";
import { LOCALES, type AppLocale } from "~/i18n/config";
import de from "~/i18n/locales/de";
import en from "~/i18n/locales/en";
import type { Messages } from "~/i18n/types";

const CATALOGS: Record<AppLocale, Messages> = { de, en };

function messages(node: unknown, path: string): Array<[string, string]> {
  if (typeof node === "string") return [[path, node]];
  if (Array.isArray(node)) return node.flatMap((child, index) => messages(child, `${path}[${index}]`));
  return Object.entries(node as Record<string, unknown>).flatMap(([name, child]) =>
    messages(child, path ? `${path}.${name}` : name)
  );
}

describe("i18n catalogs", () => {
  it.each(LOCALES)("contain only valid vue-i18n messages in %s, so @ { } in texts are escaped", (locale) => {
    const broken = messages(CATALOGS[locale], "").flatMap(([path, message]) => {
      const errors: string[] = [];
      const onError = (error: Error) => void errors.push(error.message);
      compile(message, { key: path, locale, onError, warnHtmlMessage: false });
      return errors.map((error) => `${path}: ${error}`);
    });
    expect(broken).toEqual([]);
  });

  it.each([
    ["an unescaped @", "support@example.org"],
    ["an unclosed brace", "Hallo {name"],
    ["a stray closing brace", "Hallo name}"],
  ])("detects %s", (_, message) => {
    const errors: string[] = [];
    const onError = (error: Error) => void errors.push(error.message);
    compile(message, { key: "test", locale: "de", onError });
    expect(errors).not.toEqual([]);
  });
});
