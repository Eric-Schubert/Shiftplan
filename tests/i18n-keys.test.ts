import fs from "node:fs";
import { describe, expect, it } from "vitest";
import de from "~/i18n/locales/de";
import { LOCALES, localeTag } from "~/i18n/config";
import { PATTERN_LOCALES } from "~/shared/utils/format/patterns";
import { repoFiles } from "../scripts/repo-files.js";

// vue-i18n accepts any string as a key, so `npm run typecheck` does not catch a typo in the app.
// This checks every literal key passed to t(), $t(), tm() or $tm() in app code against the German catalog,
// the keypath of <i18n-t>, which renders a message with elements in its placeholders, and every other
// string that starts with a namespace: keys in maps, ternaries and variables reach t() without a literal.
const APP_CODE = /^(?:components|pages|composables|stores|utils|layouts|plugins|types)\/.*\.(?:vue|ts|js)$|^(?:app|error)\.vue$/;
const CALL = /(?<![\w$])\$?(t|tm)\(\s*(["'])([^"'`]+)\2/g;
const KEYPATH = /<i18n-t\b[^>]*?\skeypath=(["'])([^"']+)\1/g;
// Not right after "=": that quote opens a template attribute, as in :member-id="member.id".
const KEY_LITERAL = new RegExp(`(?<!=)["'\`]((?:${Object.keys(de).join("|")})\\.[\\w.]+)["'\`]`, "g");

function lookup(path: string): unknown {
  return path.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], de);
}

/** "file: key" for each literal key that has no message (t) or no entry (tm). */
function unknownKeys(files: Record<string, string>): string[] {
  return Object.entries(files).flatMap(([file, source]) => {
    const calls = [...source.matchAll(CALL)].map(([, call, , key]) => ({ call, key: key! }));
    const subtrees = new Set(calls.filter(({ call }) => call === "tm").map(({ key }) => key));
    const keys = [
      ...calls,
      ...[...source.matchAll(KEYPATH)].map(([, , key]) => ({ call: "t", key: key! })),
      ...[...source.matchAll(KEY_LITERAL)].map(([, key]) => ({ call: subtrees.has(key!) ? "tm" : "t", key: key! })),
    ];
    const unknown = keys.filter(({ call, key }) => {
      const entry = lookup(key);
      return call === "t" ? typeof entry !== "string" : entry === undefined;
    });
    return [...new Set(unknown.map(({ key }) => `${file}: ${key}`))];
  });
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
      "<script setup>const { t } = useI18n(); t('common.meta'); i18n.tm(\"primevue.fileSizeTypes\"); format(\"x\");",
      'const KEYS = { open: "requests.status.open", gone: "requests.status.gon" };',
      't(busy ? "app.push.checking" : `app.push.chekcing`); const key = "absence.remove.day"; t(`absence.reasons.${reason}`);',
      "</script>",
      '<template><MemberPanel :member-id="member.id" v-if="absence.note" /></template>',
    ].join("\n");
    expect(unknownKeys({ "components/A.vue": source })).toEqual([
      "components/A.vue: common.meta.nope",
      "components/A.vue: common.meta",
      "components/A.vue: app.push.nope",
      "components/A.vue: requests.status.gon",
      "components/A.vue: app.push.chekcing",
    ]);
  });
});

describe("formatter patterns", () => {
  it("have a row for every app locale, so none falls back to German silently", () => {
    expect(PATTERN_LOCALES).toEqual(expect.arrayContaining(LOCALES.map(localeTag)));
  });
});
