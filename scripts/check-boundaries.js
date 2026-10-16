import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { findCycles } from "./boundaries/cycles.js";
import { findImports, resolveImport } from "./boundaries/imports.js";
import { tokenize } from "./english/tokenize.js";

// Import rules between app, shared and server code. Only explicit imports are checked:
// the server imports everything by path, the app only auto-imports its own utils and composables.
// shared/ globals are matched by name. Object keys and type annotations (`ref: string`) are skipped,
// but a variable or untyped parameter named like a global is still reported; rename it.
// `npm run typecheck` also checks shared/ against .nuxt/tsconfig.shared.json, which has no auto-imports.
const CHECKED = /\.(vue|ts|js|mjs)$/;
const IGNORED = [/\.d\.ts$/];
const APP = /^(?:components|pages|composables|stores|utils|layouts|plugins|types)\/|^(?:app|error)\.vue$/;
// shared/ runs in the browser and in Nitro, so it may not lean on h3, Nitro, Nuxt, Vue, browser or Node globals.
const RUNTIME_GLOBALS = new Set([
  "defineEventHandler", "eventHandler", "createError", "getQuery", "readBody", "getHeader", "getCookie",
  "setCookie", "deleteCookie", "getRouterParam", "getRequestIP", "setResponseStatus", "sendRedirect",
  "useRuntimeConfig", "useStorage", "useNitroApp", "defineNitroPlugin", "useNuxtApp", "useState", "useFetch",
  "useAsyncData", "useCookie", "useRoute", "useRouter", "navigateTo", "defineNuxtPlugin", "$fetch", "ref",
  "computed", "reactive", "watch", "onMounted", "process", "Buffer", "require", "__dirname", "__filename",
  "global", "globalThis", "window", "document", "localStorage", "sessionStorage", "navigator", "location",
]);

const inside = (file, dir) => file === dir || !!file?.startsWith(`${dir}/`);

/** Feature of a service file: server/services/push.service.ts and server/services/push/* are "push". */
export function serviceFeature(file) {
  return /^server\/services\/([^/]+?)(?:\.service)?(?:\.[cm]?[jt]s)?(?:\/|$)/.exec(file ?? "")?.[1] ?? null;
}

const isFacade = (file, feature) =>
  file === `server/services/${feature}.service.ts` || file === `server/services/${feature}/index.ts`;

/**
 * [rule, (from, to, spec) => broken]. `to` is a repo path, or null for packages and virtual modules.
 * @type {Array<[string, (from: string, to: string | null, spec: string) => boolean]>}
 */
export const RULES = [
  ["app code or types/ imports server code", (from, to) => APP.test(from) && inside(to, "server")],
  // The SSR build keeps shared/ external and rewrites relative paths wrongly, and vitest only knows ~.
  [
    "imports shared/ without ~/shared/",
    (from, to, spec) => !inside(from, "shared") && inside(to, "shared") && !spec.startsWith("~/shared/"),
  ],
  ["shared code imports outside shared/", (from, to) => inside(from, "shared") && !inside(to, "shared")],
  ["server/utils imports a service", (from, to) => inside(from, "server/utils") && inside(to, "server/services")],
  [
    "service imports another service's internals instead of its facade",
    (from, to) => {
      const [own, other] = [serviceFeature(from), serviceFeature(to)];
      return !!own && !!other && own !== other && !isFacade(to, other);
    },
  ],
  ["server/lib imports a service", (from, to) => inside(from, "server/lib") && inside(to, "server/services")],
  [
    "migration imports outside server/lib/migrations (setup.js runs it without the Nitro bundle)",
    (from, to) => inside(from, "server/lib/migrations") && to !== null && !inside(to, "server/lib/migrations"),
  ],
];

function runtimeGlobals(file, source) {
  const tokens = tokenize(source).filter((token) => token.kind !== "comment");
  return tokens.flatMap((token, index) => {
    if (token.kind !== "word" || tokens[index - 1]?.text === ".") return [];
    const after = tokens[index + 1]?.text === "?" ? tokens[index + 2] : tokens[index + 1];
    if (after?.text === ":") return [];
    if (token.text === "import" && tokens[index + 1]?.text === ".") return [{ file, line: token.line, rule: "shared code uses import.meta" }];
    return RUNTIME_GLOBALS.has(token.text) ? [{ file, line: token.line, rule: `shared code uses the runtime global ${token.text}` }] : [];
  });
}

/** Rule violations in the given repo files, as { file, line, rule, detail }. */
export function findViolations(files, readFile = (file) => fs.readFileSync(file, "utf-8")) {
  const known = new Set(files);
  const violations = [];
  const edges = [];
  for (const file of files.filter((name) => CHECKED.test(name) && !IGNORED.some((pattern) => pattern.test(name)))) {
    const source = readFile(file);
    for (const { spec, line } of findImports(file, source)) {
      const to = resolveImport(file, spec, known);
      if (to !== null && known.has(to)) edges.push({ from: file, to, line });
      for (const [rule, broken] of RULES) if (broken(file, to, spec)) violations.push({ file, line, rule, detail: spec });
    }
    if (file.startsWith("shared/")) violations.push(...runtimeGlobals(file, source).map((found) => ({ ...found, detail: "" })));
  }
  for (const group of findCycles(edges)) {
    const edge = edges.find(({ from, to }) => from === group[0] && group.includes(to));
    violations.push({ file: group[0], line: edge.line, rule: "import cycle", detail: group.join(" ↔ ") });
  }
  return violations;
}

function main() {
  const report = process.argv.includes("--report");
  const files = execFileSync("git", ["ls-files"], { encoding: "utf-8" }).split("\n").filter(Boolean);
  const violations = findViolations(files);

  if (violations.length === 0) {
    console.log("No import boundary violations.");
    return;
  }

  for (const { file, line, rule, detail } of violations) {
    const text = detail ? `${rule}: ${detail}` : rule;
    console.log(report ? `${file}:${line} ${text}` : `::error file=${file},line=${line}::${text}`);
  }
  const counts = Object.entries(Object.groupBy(violations, ({ rule }) => rule));
  console.log(`\n${violations.length} import boundary violations:`);
  for (const [rule, list] of counts) console.log(`${String(list.length).padStart(4)}  ${rule}`);
  if (report) console.log("Report mode: not failing.");
  else process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
