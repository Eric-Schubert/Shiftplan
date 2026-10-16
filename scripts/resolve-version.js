




import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(import.meta.dirname, "..");
const VERSION_FILE = path.join(ROOT, ".version");

function resolveVersion() {
  if (process.env.APP_VERSION) {
    return process.env.APP_VERSION;
  }

  try {
    const raw = execFileSync("git", ["describe", "--tags", "--always"], {
      cwd: ROOT,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();

    const tagMatch = raw.match(/^v?(\d+\.\d+\.\d+)(?:-(\d+)-g[a-f0-9]+)?$/);

    if (!tagMatch) return null;

    const [, base, commits] = tagMatch;
    return commits ? `${base}+${commits}` : base;
  } catch {
    return null;
  }
}

function getFallbackVersion() {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf-8"));
    return pkg.version || "0.0.0";
  } catch {
    return "0.0.0";
  }
}

const version = resolveVersion() || getFallbackVersion();

fs.writeFileSync(VERSION_FILE, version, "utf-8");
console.log(`Version: ${version} -> .version`);
