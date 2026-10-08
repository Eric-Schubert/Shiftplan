import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

// git-cliff context from `--from-context <file>`, or from running git-cliff in root.
export function loadContext(root) {
  const args = process.argv.slice(2);
  const fromContextIdx = args.indexOf("--from-context");

  if (fromContextIdx !== -1 && args[fromContextIdx + 1]) {
    const contextPath = path.resolve(args[fromContextIdx + 1]);
    console.log(`[changelog] Reading context from ${contextPath}`);
    const raw = fs.readFileSync(contextPath, "utf-8");
    return JSON.parse(raw);
  }

  console.log("[changelog] Running git-cliff --context ...");
  const raw = execSync("git-cliff --context", {
    encoding: "utf-8",
    timeout: 15000,
    cwd: root,
    stdio: ["pipe", "pipe", "pipe"],
  });
  return JSON.parse(raw);
}
