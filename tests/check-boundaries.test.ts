import { describe, expect, it } from "vitest";
import { findCycles } from "../scripts/boundaries/cycles.js";
import { findImports, resolveImport } from "../scripts/boundaries/imports.js";
import { serviceFeature } from "../scripts/check-boundaries.js";
import { checkBoundaries as check } from "./helpers/boundaries";

describe("boundary check imports", () => {
  it("finds static, type, side-effect, re-export, dynamic and require imports with their line", () => {
    const source = [
      'import a from "./a";',
      'import type { B } from "~/b";',
      "import {",
      "  c,",
      '} from "../c";',
      'import "./side-effect";',
      'export * from "#shared/utils/week";',
      'const d = await import("./d");',
      'const e = require("./e");',
      '// import f from "./f";',
      'const text = "import g from ./g";',
      "if (import.meta.dev) input.from = 1;",
    ].join("\n");

    expect(findImports("x.ts", source)).toEqual([
      { spec: "./a", line: 1 },
      { spec: "~/b", line: 2 },
      { spec: "../c", line: 5 },
      { spec: "./side-effect", line: 6 },
      { spec: "#shared/utils/week", line: 7 },
      { spec: "./d", line: 8 },
      { spec: "./e", line: 9 },
    ]);
  });

  it("reads only the script blocks of Vue files", () => {
    const source = ['<template><p>import x from "./x"</p></template>', '<script setup lang="ts">', 'import y from "./y";', "</script>"].join("\n");
    expect(findImports("x.vue", source)).toEqual([{ spec: "./y", line: 3 }]);
  });

  it("resolves Nuxt aliases, relative paths and file extensions", () => {
    const files = new Set(["server/services/push/index.ts", "server/services/a.service.ts", "shared/utils/week.ts", "utils/changelog.ts"]);
    expect(resolveImport("components/a.vue", "~/server/services/push", files)).toBe("server/services/push/index.ts");
    expect(resolveImport("components/a.vue", "#server/services/a.service", files)).toBe("server/services/a.service.ts");
    expect(resolveImport("components/a.vue", "#server", files)).toBe("server");
    expect(resolveImport("server/x.ts", "~~/shared/utils/week", files)).toBe("shared/utils/week.ts");
    expect(resolveImport("server/x.ts", "#shared/utils/week", files)).toBe("shared/utils/week.ts");
    expect(resolveImport("shared/x.ts", "#shared", files)).toBe("shared");
    expect(resolveImport("utils/changelog/types.ts", "../changelog", files)).toBe("utils/changelog.ts");
    expect(resolveImport("server/x.ts", "~/server/missing", files)).toBe("server/missing");
    expect(resolveImport("server/x.ts", "h3", files)).toBeNull();
    expect(resolveImport("server/x.ts", "#imports", files)).toBeNull();
  });
});

describe("boundary check rules", () => {
  it("names the feature of a service file", () => {
    expect(serviceFeature("server/services/push.service.ts")).toBe("push");
    expect(serviceFeature("server/services/push/web.ts")).toBe("push");
    expect(serviceFeature("server/services/push-relay.service.ts")).toBe("push-relay");
    expect(serviceFeature("server/services/rotation/weeks")).toBe("rotation");
    expect(serviceFeature("server/utils/database.ts")).toBeNull();
  });

  it("reports app code and types that import server code, also through #server", () => {
    const contents = {
      "components/A.vue": '<script setup>\nimport x from "~/server/utils/x";\n</script>',
      "app.vue": '<script setup>import "#server/y";</script>',
      "types/a.ts": 'import type { B } from "#server";',
      "server/api/x.get.ts": 'import "~/server/utils/x";',
    };
    const rule = "app code or types/ imports server code";
    expect(check(contents)).toEqual([`components/A.vue:2 ${rule}`, `app.vue:1 ${rule}`, `types/a.ts:1 ${rule}`]);
    expect(check({ "pages/index.vue": '<script setup>import x from "~/shared/utils/week";</script>' })).toEqual([]);
  });

  it("requires ~/shared/ for imports of shared/ from anywhere else", () => {
    const contents = {
      "utils/a.ts": 'import { x } from "../shared/utils/week";\nimport { y } from "~/shared/utils/week";',
      "server/b.ts": 'import "#shared/utils/week";',
      "tests/c.test.ts": 'await import("../shared/utils/week");',
      "shared/utils/d.ts": 'import "./week";\nimport "#shared";',
    };
    const rule = "imports shared/ without ~/shared/";
    expect(check(contents)).toEqual([`utils/a.ts:1 ${rule}`, `server/b.ts:1 ${rule}`, `tests/c.test.ts:1 ${rule}`]);
  });

  it("keeps shared code free of other folders, packages and runtime globals", () => {
    const source = [
      'import { a } from "./a";',
      'import b from "~/utils/b";',
      'import c from "h3";',
      "process.env.X;",
      "throw createError({});",
      "const ok = date.process;",
      "// ref() in a comment",
      "const width = window.innerWidth + globalThis.process.pid;",
      "function f(ref: string, watch?: boolean) { return { process: ref }; }",
    ].join("\n");
    expect(check({ "shared/utils/a.ts": "", "shared/utils/x.ts": source })).toEqual([
      "shared/utils/x.ts:2 shared code imports outside shared/",
      "shared/utils/x.ts:3 shared code imports outside shared/",
      "shared/utils/x.ts:4 shared code uses the runtime global process",
      "shared/utils/x.ts:5 shared code uses the runtime global createError",
      "shared/utils/x.ts:8 shared code uses the runtime global window",
      "shared/utils/x.ts:8 shared code uses the runtime global globalThis",
      "shared/utils/x.ts:9 shared code uses the runtime global ref",
    ]);
  });

  it("lets app and server import i18n/, which imports only i18n/, shared/ and its packages", () => {
    const contents = {
      "i18n/server.ts": 'import { translate } from "@intlify/core";\nimport de from "./locales/de";\nimport "~/shared/utils/week";',
      "i18n/locales/de/index.ts": "export default {};",
      "i18n/x.ts": 'import { h } from "h3";\nimport "~/server/utils/y";\nimport "~/utils/z";\nconst config = useRuntimeConfig();',
      "server/utils/locale.ts": 'import { t } from "~/i18n/server";',
      "components/A.vue": '<script setup>import { LOCALES } from "~/i18n/config";</script>',
    };
    const rule = "i18n code imports outside i18n/, shared/ or its packages";
    expect(check(contents)).toEqual([
      `i18n/x.ts:1 ${rule}`,
      `i18n/x.ts:2 ${rule}`,
      `i18n/x.ts:3 ${rule}`,
      "i18n/x.ts:4 i18n code uses the runtime global useRuntimeConfig",
    ]);
  });
});

describe("boundary check cycles", () => {
  it("finds import cycles once, including type-only imports", () => {
    expect(findCycles([{ from: "a", to: "b" }, { from: "b", to: "c" }, { from: "c", to: "a" }, { from: "c", to: "d" }])).toEqual([["a", "b", "c"]]);
    expect(findCycles([{ from: "a", to: "a" }])).toEqual([["a"]]);
    expect(findCycles([{ from: "a", to: "b" }])).toEqual([]);

    const contents = { "utils/log.ts": 'import type { Entry } from "./log/legacy";', "utils/log/legacy.ts": 'import type { Entry } from "../log";' };
    expect(check(contents)).toEqual(["utils/log.ts:1 import cycle"]);
  });
});
