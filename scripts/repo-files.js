import { execFileSync } from "node:child_process";
import fs from "node:fs";

/**
 * Files the lint scripts check: tracked ones plus new files that are not staged yet, so a local run
 * sees what CI will see after the commit. Ignored files and tracked files deleted on disk are left out.
 */
export function repoFiles() {
  return execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { encoding: "utf-8" })
    .split("\n")
    .filter((file) => file && fs.existsSync(file));
}
