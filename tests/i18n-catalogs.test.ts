import { compile } from "@intlify/core";
import { describe, expect, it } from "vitest";
import de from "~/i18n/locales/de";

function messages(node: unknown, path: string): Array<[string, string]> {
  if (typeof node === "string") return [[path, node]];
  if (Array.isArray(node)) return node.flatMap((child, index) => messages(child, `${path}[${index}]`));
  return Object.entries(node as Record<string, unknown>).flatMap(([name, child]) =>
    messages(child, path ? `${path}.${name}` : name)
  );
}

describe("i18n catalogs", () => {
  it("contain only valid vue-i18n messages, so @ { } in texts are escaped", () => {
    const broken = messages(de, "").flatMap(([path, message]) => {
      const errors: string[] = [];
      const onError = (error: Error) => void errors.push(error.message);
      compile(message, { key: path, locale: "de", onError, warnHtmlMessage: false });
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
