/**
 * Generiert utils/changelog.generated.json aus git-cliff
 *
 * Zwei Modi:
 * 1. CI:    node scripts/generate-changelog.js --from-context __cliff_context.json
 * 2. Lokal: node scripts/generate-changelog.js
 *
 * Fallback: Wenn git-cliff nicht verfügbar ist, wird [] geschrieben.
 */

import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const OUTPUT_PATH = path.join(ROOT, "utils", "changelog.generated.json");

/**
 * git-cliff Context JSON laden
 */
function loadContext() {
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
    cwd: ROOT,
    stdio: ["pipe", "pipe", "pipe"],
  });
  return JSON.parse(raw);
}

/**
 * Prüft ob ein Commit-Message ein Conventional Commit ist
 */
function isConventionalCommit(message) {
  return /^(feat|fix|perf|security|refactor|style|test|chore|ci|docs?|build|revert)(\(.+?\))?!?:\s/.test(message);
}

/**
 * git-cliff Context in App-Format transformieren
 */
function transformReleases(context) {
  return context
      .filter((release) => release.version)
      .map((release) => {
        const date = new Date(release.timestamp * 1000)
            .toISOString()
            .split("T")[0];

        const seen = new Set();
        const changes = [];

        for (const commit of release.commits || []) {
          // Nur Commits mit einer zugewiesenen Gruppe (feat, fix, etc.)
          if (!commit.group) continue;

          let msg = commit.message || "";
          msg = msg.split("\n")[0];

          // Nur Conventional Commits durchlassen
          if (!isConventionalCommit(msg)) continue;

          // Prefix entfernen
          msg = msg.replace(/^(feat|fix|perf|security)(\(.+?\))?!?:\s*/i, "");
          msg = msg.charAt(0).toUpperCase() + msg.slice(1);

          // Duplikate vermeiden
          if (!msg || seen.has(msg.toLowerCase())) continue;
          seen.add(msg.toLowerCase());

          changes.push(msg);
        }

        return { date, title: release.version, changes };
      })
      .filter((r) => r.changes.length > 0)
      // Neueste zuerst
      .sort((a, b) => b.date.localeCompare(a.date) || b.title.localeCompare(a.title));
}

// ============================================
// MAIN
// ============================================
function main() {
  let releases = [];

  try {
    const context = loadContext();
    releases = transformReleases(context);
    console.log(`[changelog] Generated ${releases.length} release(s) from git tags`);
  } catch (err) {
    const msg = err.message?.split("\n")[0] || String(err);

    if (msg.includes("ENOENT") || msg.includes("not found") || msg.includes("not recognized")) {
      console.log("[changelog] git-cliff not installed — writing empty changelog");
      console.log("[changelog] Install: https://git-cliff.org/docs/installation");
    } else if (msg.includes("JSON") || msg.includes("Unexpected")) {
      console.log("[changelog] Failed to parse git-cliff output:", msg);
    } else {
      console.log("[changelog] Error:", msg);
    }
  }

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(releases, null, 2), "utf-8");
  console.log(`[changelog] Wrote ${OUTPUT_PATH} (${releases.length} entries)`);
}

main();