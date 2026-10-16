import fs from "node:fs";
import { describe, expect, it } from "vitest";
import de from "~/i18n/locales/de";
import { LOCALES, localeTag } from "~/i18n/config";
import { PATTERN_LOCALES } from "~/shared/utils/format/patterns";
import { repoFiles } from "../scripts/repo-files.js";

// vue-i18n accepts any string as a key, so `npm run typecheck` does not catch a typo in the app.
// This checks every literal key passed to t(), $t(), tm() or $tm() in app code against the German catalog,
// and the keypath of <i18n-t>, which renders a message with elements in its placeholders.
const APP_CODE = /^(?:components|pages|composables|stores|utils|layouts|plugins)\/.*\.(?:vue|ts)$|^(?:app|error)\.vue$/;
const CALL = /(?<![\w$])\$?(t|tm)\(\s*(["'])([^"'`]+)\2/g;
const KEYPATH = /<i18n-t\b[^>]*?\skeypath=(["'])([^"']+)\1/g;

function lookup(path: string): unknown {
  return path.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], de);
}

/** "file: key" for each literal key that has no message (t) or no entry (tm). */
function unknownKeys(files: Record<string, string>): string[] {
  return Object.entries(files).flatMap(([file, source]) =>
    [
      ...[...source.matchAll(CALL)].map(([, call, , key]) => ({ call, key })),
      ...[...source.matchAll(KEYPATH)].map(([, , key]) => ({ call: "t", key })),
    ].flatMap(({ call, key }) => {
      const entry = lookup(key!);
      const known = call === "t" ? typeof entry === "string" : entry !== undefined;
      return known ? [] : [`${file}: ${key}`];
    })
  );
}

describe("translation keys in app code", () => {
  it("exist in the German catalog", () => {
    const files = repoFiles().filter((file) => APP_CODE.test(file));
    const sources = Object.fromEntries(files.map((file) => [file, fs.readFileSync(file, "utf-8")]));
    expect(unknownKeys(sources)).toEqual([]);
  });

  it("finds unknown keys in templates and scripts", () => {
    const source = [
      '<template>{{ $t("common.meta.nope") }} {{ t("common.meta.description") }}',
      '<i18n-t keypath="app.push.install.share" tag="li" /><i18n-t tag="p" keypath="app.push.nope" /></template>',
      "<script setup>const { t } = useI18n(); t('common.meta'); i18n.tm(\"primevue.fileSizeTypes\"); format(\"x\");</script>",
    ].join("\n");
    expect(unknownKeys({ "components/A.vue": source })).toEqual([
      "components/A.vue: common.meta.nope",
      "components/A.vue: common.meta",
      "components/A.vue: app.push.nope",
    ]);
  });
});

describe("formatter patterns", () => {
  it("have a row for every app locale, so none falls back to German silently", () => {
    expect(PATTERN_LOCALES).toEqual(expect.arrayContaining(LOCALES.map(localeTag)));
  });
});
