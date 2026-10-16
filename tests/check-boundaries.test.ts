import { describe, expect, it } from "vitest";
import { findCycles } from "../scripts/boundaries/cycles.js";
import { findImports, resolveImport } from "../scripts/boundaries/imports.js";
import { findViolations, serviceFeature } from "../scripts/check-boundaries.js";

type Violation = { file: string; line: number; rule: string; detail: string };

const check = (contents: Record<string, string>) =>
  findViolations(Object.keys(contents), (file: string) => contents[file] ?? "").map(
    ({ file, line, rule }: Violation) => `${file}:${line} ${rule}`
  );

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
    const files = new Set(["server/services/push/index.ts", "shared/utils/week.ts", "utils/changelog.ts"]);
    expect(resolveImport("components/a.vue", "~/server/services/push", files)).toBe("server/services/push/index.ts");
    expect(resolveImport("server/x.ts", "~~/shared/utils/week", files)).toBe("shared/utils/week.ts");
    expect(resolveImport("server/x.ts", "#shared/utils/week", files)).toBe("shared/utils/week.ts");
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

  it("reports app code that imports server code", () => {
    const contents = {
      "components/A.vue": '<script setup>\nimport x from "~/server/utils/x";\n</script>',
      "app.vue": '<script setup>import "~/server/y";</script>',
      "server/api/x.get.ts": 'import "~/server/utils/x";',
    };
    expect(check(contents)).toEqual(["components/A.vue:2 app code imports server code", "app.vue:1 app code imports server code"]);
    expect(check({ "pages/index.vue": '<script setup>import x from "~/shared/utils/week";</script>' })).toEqual([]);
  });

  it("reports app code that imports shared/ by a relative path", () => {
    const contents = { "utils/a.ts": 'import { x } from "../shared/utils/week";\nimport { y } from "~/shared/utils/week";', "server/b.ts": 'import "../shared/utils/week";' };
    expect(check(contents)).toEqual(["utils/a.ts:1 app code imports shared/ by a relative path instead of ~/shared"]);
  });

  it("keeps shared code free of other folders, packages and runtime globals", () => {
    const source = ['import { a } from "./a";', 'import b from "~/utils/b";', 'import c from "h3";', "process.env.X;", "throw createError({});", "const ok = date.process;", "// ref() in a comment"].join("\n");
    expect(check({ "shared/utils/a.ts": "", "shared/utils/x.ts": source })).toEqual([
      "shared/utils/x.ts:2 shared code imports outside shared/",
      "shared/utils/x.ts:3 shared code imports outside shared/",
      "shared/utils/x.ts:4 shared code uses the runtime global process",
      "shared/utils/x.ts:5 shared code uses the runtime global createError",
    ]);
  });

  it("reports server/utils and server/lib importing services", () => {
    expect(check({ "server/utils/flow.ts": 'import { A } from "~/server/services/a.service";', "server/lib/x/y.ts": 'import { B } from "~/server/services/b/c";' })).toEqual([
      "server/utils/flow.ts:1 server/utils imports a service",
      "server/lib/x/y.ts:1 server/lib imports a service",
    ]);
  });

  it("lets services reach other features only through their facade", () => {
    const contents = {
      "server/services/b.service.ts": "",
      "server/services/c/index.ts": "",
      "server/services/a/x.ts": ['import "~/server/services/b.service";', 'import "~/server/services/c";', 'import "~/server/services/b/internal";', 'import "./y";'].join("\n"),
    };
    expect(check(contents)).toEqual(["server/services/a/x.ts:3 service imports another service's internals instead of its facade"]);
  });

  it("keeps migrations inside server/lib/migrations", () => {
    const migration = ['import fs from "node:fs";', 'import { up } from "../schema.js";', 'import { x } from "../../../utils/x.js";'].join("\n");
    expect(check({ "server/lib/migrations/main/001.js": migration })).toEqual([
      "server/lib/migrations/main/001.js:3 migration imports outside server/lib/migrations (setup.js runs it without the Nitro bundle)",
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
