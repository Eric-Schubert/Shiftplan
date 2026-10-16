import { readText } from "./files.js";

// The app API spec is written in parts: one file per path below paths/ and the components, held
// together by $ref entries in openapi.yaml. Readers and the app repository get one file, the bundle,
// which `npm run docs` writes and CI compares. Plain Node, no YAML library: the bundle is the root
// with every `$ref` line replaced by the referenced block, indented to where the line was.
export const SPEC_DIR = "docs/api/app-v1";
export const SPEC_ROOT = `${SPEC_DIR}/openapi.yaml`;
export const SPEC_BUNDLE = "docs/api/app-v1.yaml";
const HEADER = `# Generated from ${SPEC_DIR}/ by \`npm run docs\`. Edit the files there, not this one.`;

const REF_LINE = /^(\s*)\$ref:\s*"([^"]+)"\s*$/;
const REF = /\$ref:\s*"([^"]+)"/g;
const KEY = /^(\s*)([^\s#-][^:]*):/;

const indentOf = (line) => line.length - line.trimStart().length;
const escapePointer = (key) => key.replace(/~/g, "~0").replace(/\//g, "~1");

function lines(text) {
  const all = text.split("\n");
  if (all.at(-1) === "") all.pop();
  return all;
}

/** Moves a block right (positive) or left; blank lines stay empty. */
function shift(block, delta) {
  return block.map((line) => {
    if (line.trim() === "") return "";
    if (delta >= 0) return " ".repeat(delta) + line;
    if (indentOf(line) < -delta) throw new Error(`Cannot move "${line.trim()}" ${-delta} columns left`);
    return line.slice(-delta);
  });
}

function normalize(file) {
  const parts = [];
  for (const part of file.split("/")) {
    if (part === "..") parts.pop();
    else if (part !== "." && part !== "") parts.push(part);
  }
  return parts.join("/");
}

/** "file#fragment" a reference points to, resolved against the file it is written in. */
function target(fromFile, ref) {
  const [file, fragment = ""] = ref.split("#");
  const directory = fromFile.includes("/") ? fromFile.slice(0, fromFile.lastIndexOf("/")) : ".";
  return `${file ? normalize(`${directory}/${file}`) : fromFile}#${fragment}`;
}

/** The block below the top-level key a "#/Name" fragment names, without that key's indentation. */
function section(file, body, fragment) {
  if (!/^\/[^/]+$/.test(fragment)) throw new Error(`${file}: only "#/Name" fragments are supported, not "${fragment}"`);
  const start = body.findIndex((line) => line === `${fragment.slice(1)}:`);
  if (start === -1) throw new Error(`${file} has no top-level "${fragment.slice(1)}"`);
  let end = start + 1;
  while (end < body.length && (body[end].trim() === "" || indentOf(body[end]) > 0)) end++;
  const block = body.slice(start + 1, end);
  while (block.at(-1)?.trim() === "") block.pop();
  return shift(block, -2);
}

/** Where the root mounts each part: "paths/instance.yaml#" → "#/paths/~1api~1instance". */
function mountTable(root, rootLines) {
  const mounts = new Map();
  const keys = [];
  for (const line of rootLines) {
    const ref = REF_LINE.exec(line);
    const key = KEY.exec(line);
    if (ref) {
      const inside = keys.filter((entry) => entry.indent < ref[1].length);
      mounts.set(target(root, ref[2]), `#/${inside.map((entry) => escapePointer(entry.key)).join("/")}`);
    } else if (key) {
      while (keys.length && keys.at(-1).indent >= key[1].length) keys.pop();
      keys.push({ indent: key[1].length, key: key[2] });
    }
  }
  return mounts;
}

/** The whole spec as one document. `read` takes a repo path; tests pass their own. */
export function bundleApiSpec({ root = SPEC_ROOT, read = readText } = {}) {
  const rootLines = lines(read(root));
  const mounts = mountTable(root, rootLines);
  const rewrite = (file, line) =>
    line.replace(REF, (_, ref) => {
      const pointer = mounts.get(target(file, ref));
      if (!pointer) throw new Error(`${file}: $ref "${ref}" points to nothing the root mounts`);
      return `$ref: "${pointer}"`;
    });

  const out = [HEADER];
  for (const line of rootLines) {
    const ref = REF_LINE.exec(line);
    if (!ref) {
      out.push(line);
      continue;
    }
    const [file, fragment] = target(root, ref[2]).split("#");
    const body = lines(read(file));
    const block = fragment ? section(file, body, fragment) : body;
    out.push(...shift(block, ref[1].length).map((inlined) => rewrite(file, inlined)));
  }
  return `${out.join("\n")}\n`;
}
