import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { pathToFileURL } from "node:url";

// Aim for about 100 lines per file. Above this limit CI fails.
export const MAX_LINES = 150;

const CHECKED = /\.(vue|ts|js|mjs)$/;
const IGNORED = [/\.d\.ts$/];

export function countLines(text) {
  if (text === "") return 0;
  return text.split("\n").length - (text.endsWith("\n") ? 1 : 0);
}

export function findLongFiles(files, readFile = (file) => fs.readFileSync(file, "utf-8")) {
  return files
    .filter((file) => CHECKED.test(file) && !IGNORED.some((pattern) => pattern.test(file)))
    .map((file) => ({ file, lines: countLines(readFile(file)) }))
    .filter((entry) => entry.lines > MAX_LINES)
    .sort((a, b) => b.lines - a.lines);
}

function main() {
  const files = execFileSync("git", ["ls-files"], { encoding: "utf-8" }).split("\n").filter(Boolean);
  const longFiles = findLongFiles(files);

  if (longFiles.length === 0) {
    console.log(`All files have at most ${MAX_LINES} lines.`);
    return;
  }

  for (const { file, lines } of longFiles) {
    console.error(`::error file=${file}::${lines} lines, limit is ${MAX_LINES}. Split the file.`);
  }
  process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
