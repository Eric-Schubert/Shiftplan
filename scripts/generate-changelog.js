




import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  evaluateCommitMessage,
  getVisiblePrefixes,
} from "./release-rules.js";

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




function isConventionalCommit(message) {
  const result = evaluateCommitMessage(message);
  return result.conventional && (result.visible || result.hidden);
}

function stripVisiblePrefix(message) {
  return message.replace(VISIBLE_PREFIX_PATTERN, "");
}

function capitalizeFirst(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getCommitMessageParts(commit) {
  const raw = String(commit.raw_message || "");

  if (raw) {
    const lines = raw.split(/\r?\n/);
    return {
      subject: (lines.shift() || "").trim(),
      body: lines.join("\n").trim(),
    };
  }

  return {
    subject: String(commit.message || "").split(/\r?\n/)[0].trim(),
    body: String(commit.body || "").trim(),
  };
}

function cleanChangeLine(line) {
  return String(line)
    .trim()
    .replace(/^[-*+]\s+/, "")
    .replace(/^\d+[.)]\s+/, "")
    .trim();
}

function isCommitFooter(line) {
  return /^(co-authored-by|signed-off-by|refs?|closes|fixes):\s+/i.test(line);
}

function bodyToChanges(body) {
  return String(body || "")
    .split(/\r?\n/)
    .map(cleanChangeLine)
    .filter((line) => line && !isCommitFooter(line))
    .map(capitalizeFirst);
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

function addUniqueChanges(target, changes, seen) {
  for (const change of changes) {
    if (!change || seen.has(change.toLowerCase())) continue;
    seen.add(change.toLowerCase());
    target.push(change);
  }
}

function parseVersionParts(version) {
  const match = String(version).match(/\d+(?:\.\d+)*/);
  if (!match) return [];

  return match[0].split(".").map((part) => Number.parseInt(part, 10));
}

export function compareVersions(a, b) {
  const aParts = parseVersionParts(a);
  const bParts = parseVersionParts(b);
  const maxLength = Math.max(aParts.length, bParts.length);

  for (let i = 0; i < maxLength; i += 1) {
    const diff = (aParts[i] || 0) - (bParts[i] || 0);
    if (diff !== 0) return diff;
  }

  return String(a).localeCompare(String(b));
}

export function compareChangelogEntries(a, b) {
  return b.date.localeCompare(a.date) || compareVersions(b.title, a.title);
}

async function fetchGithubReleaseBody(tagName) {
  const repository = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

  if (!repository || !token || typeof fetch !== "function") return "";

  const response = await fetch(
    `https://api.github.com/repos/${repository}/releases/tags/${encodeURIComponent(tagName)}`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );

  if (!response.ok) {
    console.log(`[changelog] GitHub release body unavailable for ${tagName}: ${response.status}`);
    return "";
  }

  const release = await response.json();
  return typeof release.body === "string" ? release.body : "";
}

async function mergeGithubReleaseBodies(entries) {
  if (!process.env.GITHUB_REPOSITORY || !(process.env.GITHUB_TOKEN || process.env.GH_TOKEN)) {
    return entries;
  }

  const merged = [];

  for (const entry of entries) {
    const body = await fetchGithubReleaseBody(entry.title);
    const releaseChanges = releaseBodyToChanges(body);

    if (releaseChanges.length === 0) {
      merged.push(entry);
      continue;
    }

    const changes = [];
    const seen = new Set();

    addUniqueChanges(changes, releaseChanges, seen);
    addUniqueChanges(changes, entry.changes, seen);

    merged.push({ ...entry, changes });
  }

  return merged;
}




export function transformReleases(context) {
  const releases = Array.isArray(context) ? context : context.releases || [];

  return releases
      .filter((release) => release.version)
      .map((release) => {
        const date = new Date(release.timestamp * 1000)
            .toISOString()
            .split("T")[0];

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
    const context = loadContext();
    releases = transformReleases(context);
    releases = await mergeGithubReleaseBodies(releases);
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
