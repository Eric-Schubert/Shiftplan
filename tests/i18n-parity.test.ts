import { describe, expect, it } from "vitest";
import de from "~/i18n/locales/de";
import en from "~/i18n/locales/en";

// `satisfies` in each catalog file already breaks the typecheck on a missing or extra key. This also
// compares what a type cannot see: the placeholders and plural forms of every message.
const OTHER_LOCALES = { en };

function messages(node: unknown, path: string): Array<[string, string]> {
  if (typeof node === "string") return [[path, node]];
  if (Array.isArray(node)) return node.flatMap((child, index) => messages(child, `${path}[${index}]`));
  return Object.entries(node as Record<string, unknown>).flatMap(([name, child]) => messages(child, path ? `${path}.${name}` : name));
}

const placeholders = (message: string) => [...new Set([...message.matchAll(/\{\s*(\w+)\s*\}/g)].map((match) => match[1]))].sort();

/** Plural forms: parts split by a „|“ outside of {…}. */
function forms(message: string): number {
  let depth = 0;
  let count = 1;
  for (const char of message) {
    if (char === "{") depth++;
    else if (char === "}") depth--;
    else if (char === "|" && depth === 0) count++;
  }
  return count;
}

const reference = new Map(messages(de, ""));

describe.each(Object.entries(OTHER_LOCALES))("the %s catalog", (_, catalog) => {
  const translated = new Map(messages(catalog, ""));

  it("has the same messages as the German one", () => {
    expect([...translated.keys()].sort()).toEqual([...reference.keys()].sort());
  });

  it("uses the same placeholders in every message", () => {
    const differing = [...reference].filter(([path, text]) => placeholders(text).join() !== placeholders(translated.get(path) ?? "").join());
    expect(differing.map(([path]) => path)).toEqual([]);
  });

  it("has the German plural forms, or singular and plural where German needs no forms", () => {
    const differing = [...reference].filter(([path, text]) => {
      const own = forms(translated.get(path) ?? "");
      return own !== forms(text) && !(forms(text) === 1 && own === 2);
    });
    expect(differing.map(([path]) => path)).toEqual([]);
  });

  it("is translated: no German umlauts or quotes left", () => {
    const german = [...translated].filter(([, text]) => /[äöüßÄÖÜ„]/.test(text));
    expect(german.map(([path]) => path)).toEqual([]);
  });
});
