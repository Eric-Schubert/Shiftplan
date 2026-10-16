import path from "node:path";
import { tokenize } from "../english/tokenize.js";

// Nuxt aliases. srcDir and rootDir are both the repo root here, so ~ and ~~ point to the same place.
const ALIASES = [
  ["~~/", ""],
  ["@@/", ""],
  ["~/", ""],
  ["@/", ""],
  ["#shared/", "shared/"],
];
const EXTENSIONS = ["", ".ts", ".js", ".mjs", ".vue", ".json", "/index.ts", "/index.js"];

function scriptBlocks(file, source) {
  if (!file.endsWith(".vue")) return [{ code: source, firstLine: 1 }];
  return [...source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map((match) => {
    const start = match.index + match[0].indexOf(">") + 1;
    return { code: match[1], firstLine: source.slice(0, start).split("\n").length };
  });
}

const literal = (token) =>
  token?.kind === "string" && !token.text.startsWith("`") ? token.text.slice(1, -1) : null;

/** Static and dynamic import specifiers of a file, as { spec, line }. Comments and strings are skipped. */
export function findImports(file, source) {
  const found = [];
  for (const { code, firstLine } of scriptBlocks(file, source)) {
    const tokens = tokenize(code, firstLine).filter((token) => token.kind !== "comment");
    tokens.forEach((token, index) => {
      if (token.kind !== "word") return;
      const next = tokens[index + 1];
      let spec = null;
      if (token.text === "from" || token.text === "import") spec = literal(next);
      if (!spec && (token.text === "import" || token.text === "require") && next?.text === "(") {
        spec = literal(tokens[index + 2]);
      }
      if (spec) found.push({ spec, line: token.text === "from" ? next.line : token.line });
    });
  }
  return found;
}

/** Repo path an import points to, or null for packages and virtual modules. */
export function resolveImport(file, spec, files = new Set()) {
  let target = null;
  if (spec === "#shared") target = "shared";
  else if (spec.startsWith(".")) target = path.posix.join(path.posix.dirname(file), spec);
  else {
    const alias = ALIASES.find(([prefix]) => spec.startsWith(prefix));
    if (alias) target = path.posix.normalize(alias[1] + spec.slice(alias[0].length));
  }
  if (target === null) return null;
  return EXTENSIONS.map((extension) => target + extension).find((candidate) => files.has(candidate)) ?? target;
}
