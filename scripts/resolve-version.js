#!/usr/bin/env node

/**
 * Version Resolver Script
 *
 * Ermittelt die App-Version aus Git-Tags und schreibt sie in .version.
 *
 * Ablauf:
 *   1. Prüfe ENV-Variable APP_VERSION (für Docker / CI)
 *   2. Falls nicht gesetzt → git describe --tags
 *   3. Fallback → Version aus package.json
 *
 * Ergebnis-Beispiele:
 *   Genau auf Tag v1.3.0   → "1.3.0"
 *   14 Commits nach v1.3.0 → "1.3.0+14"
 *   Kein Git / kein Tag    → package.json Version
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const VERSION_FILE = path.join(ROOT, ".version");

export function resolveVersion() {
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

export function getFallbackVersion() {
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
