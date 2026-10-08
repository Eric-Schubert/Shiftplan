import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  evaluateCommitMessage,
  getVisiblePrefixes,
} from "./release-rules.js";
import {
  addUniqueChanges,
  bodyToChanges,
  capitalizeFirst,
  cleanChangeLine,
  getCommitMessageParts,
} from "./changelog/commit-text.js";
import { loadContext } from "./changelog/context.js";
import { mergeGithubReleaseBodies } from "./changelog/github-releases.js";
import { compareChangelogEntries } from "./changelog/versions.js";

export { compareChangelogEntries, compareVersions } from "./changelog/versions.js";

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), "..");
const OUTPUT_PATH = path.join(ROOT, "utils", "changelog.generated.json");
const VISIBLE_PREFIX_PATTERN = new RegExp(
  `^(${getVisiblePrefixes().map(escapeRegex).join("|")})(\\(.+?\\))?!?:\\s*`,
  "i",
);

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isConventionalCommit(message) {
  const result = evaluateCommitMessage(message);
  return result.conventional && (result.visible || result.hidden);
}

function stripVisiblePrefix(message) {
  return message.replace(VISIBLE_PREFIX_PATTERN, "");
}

function commitToChanges(commit) {
  const { subject, body } = getCommitMessageParts(commit);

  if (!isConventionalCommit(subject)) return [];

  const title = capitalizeFirst(stripVisiblePrefix(subject));
  return [title, ...bodyToChanges(body)];
}

function releaseBodyToChanges(body) {
  return String(body || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map(cleanChangeLine)
    .filter(Boolean)
    .map((line) => capitalizeFirst(stripVisiblePrefix(line)));
}

export function transformReleases(context) {
  const releases = Array.isArray(context) ? context : context.releases || [];

  return releases
    .filter((release) => release.version)
    .map((release) => {
      const date = new Date(release.timestamp * 1000).toISOString().split("T")[0];
      const seen = new Set();
      const changes = [];

      for (const commit of release.commits || []) {
        if (!commit.group) continue;
        addUniqueChanges(changes, commitToChanges(commit), seen);
      }

      return { date, title: release.version, changes };
    })
    .filter((r) => r.changes.length > 0)
    .sort(compareChangelogEntries);
}

async function main() {
  let releases = [];

  try {
    const context = loadContext(ROOT);
    releases = transformReleases(context);
    releases = await mergeGithubReleaseBodies(releases, releaseBodyToChanges);
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

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((err) => {
    console.error("[changelog] Fatal error:", err);
    process.exitCode = 1;
  });
}
