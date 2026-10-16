import { getHiddenPrefixes, getVisiblePrefixes } from "../release-rules.js";
import { fileExists, readText } from "./files.js";

function parseInlineBranches(workflowText) {
  const match = workflowText.match(/branches:\s*\[([^\]]+)\]/);
  if (!match) return [];
  return match[1]
    .split(",")
    .map((branch) => branch.replace(/["'\s]/g, ""))
    .filter(Boolean);
}

function readWorkflow(name) {
  return fileExists(".github", "workflows", name) ? readText(".github", "workflows", name) : "";
}

export function generateWorkflowDocs() {
  const ci = readWorkflow("ci.yml");
  const release = readWorkflow("auto-version.yml");
  const docker = readWorkflow("docker-build.yml");
  const prefixes = {
    visible: getVisiblePrefixes(),
    hidden: getHiddenPrefixes(),
  };

  const lines = [
    "### Workflow Summary\n",
    "| Workflow | Runs On | Main Result |",
    "|----------|---------|-------------|",
    `| CI | Push and PR: ${parseInlineBranches(ci).join(", ") || "-"} | Docs check on every PR; for code changes tests, file length, typecheck (app and server), and Docker build with smoke test |`,
    `| Auto Version & Release | CI success on push: ${parseInlineBranches(release).join(", ") || "-"} | Creates version tag and GitHub release for changelog-visible commits, one at a time |`,
    `| Docker Build & Push | CI success + deploy prefix: ${parseInlineBranches(docker).join(", ") || "-"} | Builds and pushes GHCR image with generated changelog; only the newest release moves \`latest\` |`,
    "",
    "### Changelog Prefixes\n",
    "Release and deploy prefix rules are defined in `scripts/release-prefixes.json`.",
    "",
    `Visible in releases: ${prefixes.visible.map((prefix) => `\`${prefix}:\``).join(", ") || "-"}`,
    "",
    `Hidden from releases: ${prefixes.hidden.map((prefix) => `\`${prefix}:\``).join(", ") || "-"}`,
    "",
    "### Deploy Flow\n",
    "1. CI validates tests, typecheck, and the Docker image build.",
    "2. After CI passed on master, Auto Version & Release creates a tag for visible commit prefixes. A commit that a newer tag already contains gets none.",
    "3. Docker waits for the release tag, generates the in-app changelog, and pushes the image.",
    "4. Hidden prefixes such as docs, chore, ci, and test do not create releases or Docker images.",
    "5. CI fails when the generated docs are stale, also for docs-only changes; run `npm run docs` and commit the result.",
  ];

  return lines.join("\n");
}
