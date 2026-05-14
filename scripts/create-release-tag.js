import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadReleaseRules } from "./release-rules.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

function git(args, options = {}) {
  return execFileSync("git", args, {
    cwd: ROOT,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  }).trim();
}

function gitInherit(args) {
  execFileSync("git", args, {
    cwd: ROOT,
    stdio: "inherit",
  });
}

function parseTag(tag) {
  const match = tag.match(/^v(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;

  return {
    tag,
    version: match.slice(1).map(Number),
  };
}

function compareVersions(left, right) {
  for (let index = 0; index < 3; index += 1) {
    if (left.version[index] !== right.version[index]) {
      return right.version[index] - left.version[index];
    }
  }

  return 0;
}

function getLatestTag() {
  const tags = git(["tag", "--list", "v*"])
    .split(/\r?\n/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map(parseTag)
    .filter(Boolean)
    .sort(compareVersions);

  return tags[0] || { tag: "v0.0.0", version: [0, 0, 0] };
}

function getReleaseType() {
  if (process.env.RELEASE_BREAKING === "true") return "major";

  const rules = loadReleaseRules();
  const type = process.env.RELEASE_TYPE || "";
  const rule = rules.visible.find((entry) => entry.prefix === type);

  return rule?.bump || "patch";
}

function bumpVersion(version, releaseType) {
  const [major, minor, patch] = version;

  if (releaseType === "major") return [major + 1, 0, 0];
  if (releaseType === "minor") return [major, minor + 1, 0];

  return [major, minor, patch + 1];
}

function tagExists(tag) {
  try {
    git(["rev-parse", "--verify", "--quiet", `refs/tags/${tag}`]);
    return true;
  } catch {
    return false;
  }
}

function writeOutputs(outputs) {
  const lines = Object.entries(outputs).map(([key, value]) => `${key}=${value}`);

  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `${lines.join("\n")}\n`);
  } else {
    console.log(lines.join("\n"));
  }
}

const previous = getLatestTag();
const releaseType = getReleaseType();
const nextVersion = bumpVersion(previous.version, releaseType).join(".");
const newTag = `v${nextVersion}`;
const dryRun = process.env.DRY_RUN === "true";

if (tagExists(newTag)) {
  throw new Error(`Tag ${newTag} already exists.`);
}

if (!dryRun) {
  gitInherit(["tag", newTag]);
  gitInherit(["push", "origin", newTag]);
}

writeOutputs({
  previous_tag: previous.tag,
  previous_version: previous.tag.replace(/^v/, ""),
  new_tag: newTag,
  new_version: nextVersion,
  release_type: releaseType,
});
