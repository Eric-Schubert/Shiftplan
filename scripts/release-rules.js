
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_PATH = path.join(__dirname, "release-prefixes.json");

export function loadReleaseRules() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
}

export function getVisiblePrefixes() {
  return loadReleaseRules().visible.map((entry) => entry.prefix);
}

export function getHiddenPrefixes() {
  return loadReleaseRules().hidden;
}

export function getDeployPrefixes() {
  return loadReleaseRules().deploy;
}

export function getSkipTokens() {
  return loadReleaseRules().skipTokens;
}

export function parseCommitMessage(message = "") {
  const firstLine = String(message).split(/\r?\n/, 1)[0].trim();
  const match = firstLine.match(/^([a-z]+)(?:\([^)]+\))?(!)?:\s+.+/);

  return {
    firstLine,
    type: match?.[1] || "",
    breaking: Boolean(match?.[2]),
    conventional: Boolean(match),
  };
}

export function evaluateCommitMessage(message = "") {
  const rules = loadReleaseRules();
  const parsed = parseCommitMessage(message);
  const skipCi = rules.skipTokens.some((token) => String(message).includes(token));
  const visiblePrefixes = rules.visible.map((entry) => entry.prefix);
  const hiddenPrefixes = rules.hidden;
  const deployPrefixes = rules.deploy;

  const visible = parsed.conventional && visiblePrefixes.includes(parsed.type);
  const hidden = parsed.conventional && hiddenPrefixes.includes(parsed.type);
  const deploy = parsed.conventional && deployPrefixes.includes(parsed.type);

  return {
    ...parsed,
    skipCi,
    visible,
    hidden,
    release: visible && !skipCi,
    deploy: deploy && !skipCi,
  };
}

function writeGithubOutputs(outputs) {
  const lines = Object.entries(outputs).map(([key, value]) => `${key}=${value}`);

  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `${lines.join("\n")}\n`);
  } else {
    console.log(lines.join("\n"));
  }
}

function printJson(value) {
  console.log(JSON.stringify(value, null, 2));
}

function main() {
  const command = process.argv[2] || "print";
  const message = process.env.HEAD_MESSAGE || process.argv.slice(3).join(" ");

  if (command === "github-output") {
    const result = evaluateCommitMessage(message);
    writeGithubOutputs({
      type: result.type,
      conventional: String(result.conventional),
      breaking: String(result.breaking),
      visible: String(result.visible),
      hidden: String(result.hidden),
      release: String(result.release),
      deploy: String(result.deploy),
      skip_ci: String(result.skipCi),
    });
    return;
  }

  if (command === "check-release") {
    process.exitCode = evaluateCommitMessage(message).release ? 0 : 1;
    return;
  }

  if (command === "check-deploy") {
    process.exitCode = evaluateCommitMessage(message).deploy ? 0 : 1;
    return;
  }

  if (command === "print") {
    printJson(loadReleaseRules());
    return;
  }

  if (command === "evaluate") {
    printJson(evaluateCommitMessage(message));
    return;
  }

  console.error(`Unknown release-rules command: ${command}`);
  process.exitCode = 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
